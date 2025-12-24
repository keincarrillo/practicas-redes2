package org.example;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.*;
import java.nio.ByteBuffer;
import java.nio.channels.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class CrawlEngine {

    private static final String USER_AGENT = "Mozilla/5.0";
    private final EngineListener listener;

    private DownloadConfig cfg;
    private String baseHostNoWww;

    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicBoolean stopRequested = new AtomicBoolean(false);

    // cola de URLs pendientes y conjunto de URLs ya visitadas
    private final Queue<UrlJob> frontier = new ConcurrentLinkedQueue<>();
    private final Set<String> seen = ConcurrentHashMap.newKeySet();

    // contadores de estadisticas
    private final AtomicInteger attempted = new AtomicInteger(0);
    private final AtomicInteger ok = new AtomicInteger(0);
    private final AtomicInteger failed = new AtomicInteger(0);

    private volatile int inFlight = 0;

    public CrawlEngine(EngineListener listener) {
        this.listener = listener;
    }

    public boolean isRunning() {
        return running.get();
    }

    public void start(DownloadConfig cfg) {
        if (running.get()) return;
        this.cfg = cfg;
        this.baseHostNoWww = PathUtils.hostNoWww(cfg.startUrl.getHost());

        attempted.set(0);
        ok.set(0);
        failed.set(0);
        frontier.clear();
        seen.clear();
        stopRequested.set(false);

        // solo se soporta http:// para NIO no bloqueante sin SSLEngine
        if (!"http".equalsIgnoreCase(cfg.startUrl.getScheme())) {
            listener.onLog("[ADVERTENCIA] Solo se soporta http:// en modo NIO no bloqueante (HTTPS requiere SSLEngine).\n");
            listener.onStatus("Listo");
            return;
        }

        enqueue(cfg.startUrl, 0);

        running.set(true);
        Thread ioThread = new Thread(this::runSelectorLoop, "nio-selector-loop");
        ioThread.setDaemon(true);
        ioThread.start();
    }

    public void stop() {
        stopRequested.set(true);
    }

    private void runSelectorLoop() {
        listener.onStatus("Ejecutando...");
        listener.onLog("== Iniciando: " + cfg.startUrl + " ==\n");

        try (Selector selector = Selector.open()) {
            Map<SelectionKey, ConnCtx> ctxByKey = new HashMap<>();

            while (!stopRequested.get()) {

                // abrir nuevas conexiones hasta el limite
                while (inFlight < cfg.maxConnections) {
                    UrlJob job = frontier.poll();
                    if (job == null) break;
                    if (!"http".equalsIgnoreCase(job.url.getScheme())) {
                        // ignora https u otros
                        continue;
                    }
                    openConnection(selector, ctxByKey, job);
                }

                // condicion de fin
                if (frontier.isEmpty() && inFlight == 0) {
                    break;
                }

                selector.select(200);

                Iterator<SelectionKey> it = selector.selectedKeys().iterator();
                while (it.hasNext()) {
                    SelectionKey key = it.next();
                    it.remove();

                    ConnCtx ctx = ctxByKey.get(key);
                    if (ctx == null) continue;

                    try {
                        if (!key.isValid()) {
                            closeCtx(ctxByKey, key, ctx);
                            continue;
                        }

                        if (key.isConnectable()) onConnect(key, ctx);
                        if (key.isWritable()) onWrite(key, ctx);
                        if (key.isReadable()) onRead(key, ctx);
                    } catch (Exception e) {
                        fail(ctx, "Error I/O: " + e.getMessage());
                        closeCtx(ctxByKey, key, ctx);
                    }
                }

                // verificar timeouts
                long now = System.currentTimeMillis();
                for (var entry : new ArrayList<>(ctxByKey.entrySet())) {
                    ConnCtx ctx = entry.getValue();
                    if (now > ctx.deadlineMs) {
                        fail(ctx, "Timeout");
                        closeCtx(ctxByKey, entry.getKey(), ctx);
                    }
                }

                notifyProgress();
            }

        } catch (Exception e) {
            listener.onLog("[ERROR] Error fatal selector: " + e.getMessage() + "\n");
        } finally {
            running.set(false);
            listener.onStatus("Terminado.");
            listener.onFinished(attempted.get(), ok.get(), failed.get(), cfg.outputDir);
        }
    }

    private void openConnection(Selector selector, Map<SelectionKey, ConnCtx> ctxByKey, UrlJob job) throws IOException {
        String host = job.url.getHost();
        int port = (job.url.getPort() == -1) ? 80 : job.url.getPort();

        SocketChannel ch = SocketChannel.open();
        ch.configureBlocking(false);

        ConnCtx ctx = new ConnCtx(job, ch, System.currentTimeMillis() + cfg.timeoutMs);
        attempted.incrementAndGet();

        boolean connected = ch.connect(new InetSocketAddress(host, port));
        SelectionKey key = ch.register(selector, connected ? SelectionKey.OP_WRITE : SelectionKey.OP_CONNECT);
        ctx.key = key;
        ctxByKey.put(key, ctx);

        inFlight++;
        listener.onLog("-> Conectando: " + job.url + "\n");
    }

    private void onConnect(SelectionKey key, ConnCtx ctx) throws IOException {
        if (ctx.channel.finishConnect()) {
            key.interestOps(SelectionKey.OP_WRITE);
        }
    }

    private void onWrite(SelectionKey key, ConnCtx ctx) throws IOException {
        if (ctx.requestBuf == null) {
            ctx.requestBuf = ByteBuffer.wrap(buildRequest(ctx.job.url).getBytes(StandardCharsets.US_ASCII));
        }
        ctx.channel.write(ctx.requestBuf);
        if (!ctx.requestBuf.hasRemaining()) {
            key.interestOps(SelectionKey.OP_READ);
        }
    }

    private void onRead(SelectionKey key, ConnCtx ctx) throws IOException {
        int n = ctx.channel.read(ctx.readBuf);
        if (n == -1) {
            // EOF indica respuesta completa
            byte[] all = ctx.received.toByteArray();
            handleResponse(ctx, all);
            closeCtx(Map.of(), key, ctx);
            return;
        }
        if (n > 0) {
            ctx.readBuf.flip();
            ctx.received.write(ctx.readBuf.array(), 0, ctx.readBuf.limit());
            ctx.readBuf.clear();
        }
    }

    private void handleResponse(ConnCtx ctx, byte[] all) {
        // separar headers y body
        int split = indexOf(all, "\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
        if (split < 0) {
            fail(ctx, "Respuesta invalida (sin headers)");
            return;
        }

        byte[] headerBytes = Arrays.copyOfRange(all, 0, split);
        byte[] bodyBytes = Arrays.copyOfRange(all, split + 4, all.length);

        String headerText = new String(headerBytes, StandardCharsets.ISO_8859_1);
        String[] lines = headerText.split("\r\n");

        int status = parseStatus(lines.length > 0 ? lines[0] : "");
        Map<String, String> headers = parseHeaders(lines);

        // manejo de redirect basico
        if (status >= 300 && status < 400) {
            String loc = headers.get("location");
            if (loc != null) {
                try {
                    URI redir = HtmlUtils.normalize(ctx.job.url.resolve(loc));
                    listener.onLog("-> Redirect " + status + " -> " + redir + "\n");
                    enqueue(redir, ctx.job.depth);
                    ok.incrementAndGet();
                    return;
                } catch (Exception ignored) {}
            }
        }

        if (status < 200 || status >= 300) {
            fail(ctx, "HTTP " + status);
            return;
        }

        // decodificar chunked transfer encoding
        String te = headers.getOrDefault("transfer-encoding", "").toLowerCase();
        if (te.contains("chunked")) {
            try {
                bodyBytes = decodeChunked(bodyBytes);
            } catch (Exception e) {
                fail(ctx, "Chunked invalido");
                return;
            }
        }

        String ct = headers.getOrDefault("content-type", "");
        boolean isHtml = ct.toLowerCase().contains("text/html") || PathUtils.guessHtmlLike(ctx.job.url.getPath()).equals("html");

        try {
            Path outFile = PathUtils.localPath(cfg.outputDir, ctx.job.url, isHtml);
            Files.createDirectories(outFile.getParent());
            Files.write(outFile, bodyBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            ok.incrementAndGet();
            listener.onLog("[OK] Guardado: " + outFile + "\n");

            if (isHtml) {
                String html = new String(bodyBytes, StandardCharsets.UTF_8);

                // extraer y encolar enlaces si no superamos la profundidad maxima
                if (ctx.job.depth < cfg.maxDepth) {
                    for (URI link : HtmlUtils.extractLinks(html, ctx.job.url)) {
                        enqueue(link, ctx.job.depth + 1);
                    }
                }

                // reescribir enlaces a rutas locales
                String rewritten = HtmlUtils.rewriteLinksToLocal(
                        html, ctx.job.url, outFile, cfg.outputDir, baseHostNoWww, cfg.sameHostOnly
                );

                Files.writeString(outFile, rewritten, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
            }
        } catch (Exception e) {
            fail(ctx, "Guardar/Reescribir: " + e.getMessage());
        }
    }

    private void enqueue(URI uri, int depth) {
        if (uri == null) return;
        uri = HtmlUtils.normalize(uri);

        if (uri.getScheme() == null) return;
        if (!uri.getScheme().equalsIgnoreCase("http")) {
            return; // ignorar https en esta version
        }

        String host = PathUtils.hostNoWww(uri.getHost());
        if (cfg.sameHostOnly && !host.equalsIgnoreCase(baseHostNoWww)) {
            return;
        }

        // quitar fragment y normalizar puerto default
        String key = normalizeKey(uri);

        if (seen.add(key)) {
            frontier.add(new UrlJob(uri, depth));
        }
    }

    private String normalizeKey(URI uri) {
        int port = uri.getPort();
        if (port == 80) port = -1;

        String path = uri.getPath();
        if (path == null || path.isEmpty()) path = "/";

        String q = uri.getQuery();
        return (uri.getScheme().toLowerCase() + "://" +
                (uri.getHost() == null ? "" : uri.getHost().toLowerCase()) +
                (port == -1 ? "" : ":" + port) +
                path +
                (q == null ? "" : "?" + q));
    }

    private void notifyProgress() {
        listener.onProgress(
                attempted.get(),
                ok.get(),
                failed.get(),
                frontier.size(),
                inFlight
        );
    }

    private void fail(ConnCtx ctx, String reason) {
        failed.incrementAndGet();
        listener.onLog("[FALLO] Fallo: " + ctx.job.url + " (" + reason + ")\n");
    }

    private void closeCtx(Map<SelectionKey, ConnCtx> ctxByKey, SelectionKey key, ConnCtx ctx) {
        try { key.cancel(); } catch (Exception ignored) {}
        try { ctx.channel.close(); } catch (Exception ignored) {}
        inFlight = Math.max(0, inFlight - 1);
    }

    private String buildRequest(URI uri) {
        String host = uri.getHost();
        String path = uri.getRawPath();
        if (path == null || path.isEmpty()) path = "/";
        if (uri.getRawQuery() != null) path += "?" + uri.getRawQuery();

        return "GET " + path + " HTTP/1.1\r\n" +
                "Host: " + host + "\r\n" +
                "User-Agent: " + USER_AGENT + "\r\n" +
                "Accept: */*\r\n" +
                "Connection: close\r\n" +
                "\r\n";
    }

    private int parseStatus(String statusLine) {
        // parsear linea de estado HTTP/1.1 200 OK
        try {
            String[] p = statusLine.split(" ");
            return Integer.parseInt(p[1].trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private Map<String, String> parseHeaders(String[] lines) {
        Map<String, String> h = new HashMap<>();
        for (int i = 1; i < lines.length; i++) {
            int idx = lines[i].indexOf(':');
            if (idx > 0) {
                String k = lines[i].substring(0, idx).trim().toLowerCase();
                String v = lines[i].substring(idx + 1).trim();
                h.put(k, v);
            }
        }
        return h;
    }

    private int indexOf(byte[] data, byte[] pattern) {
        outer:
        for (int i = 0; i <= data.length - pattern.length; i++) {
            for (int j = 0; j < pattern.length; j++) {
                if (data[i + j] != pattern[j]) continue outer;
            }
            return i;
        }
        return -1;
    }

    private byte[] decodeChunked(byte[] chunked) throws IOException {
        ByteArrayInputStream in = new ByteArrayInputStream(chunked);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        while (true) {
            String line = readLineCRLF(in);
            if (line == null) break;
            line = line.trim();
            if (line.isEmpty()) continue;

            int semi = line.indexOf(';');
            String sizeHex = (semi >= 0) ? line.substring(0, semi) : line;

            int size = Integer.parseInt(sizeHex.trim(), 16);
            if (size == 0) {
                // consumir trailers hasta linea vacia
                while (true) {
                    String t = readLineCRLF(in);
                    if (t == null || t.isEmpty()) break;
                }
                break;
            }

            byte[] buf = in.readNBytes(size);
            out.write(buf);

            // consumir CRLF despues del chunk
            in.read(); in.read();
        }

        return out.toByteArray();
    }

    private String readLineCRLF(ByteArrayInputStream in) {
        ByteArrayOutputStream line = new ByteArrayOutputStream();
        int prev = -1;
        int b;
        while ((b = in.read()) != -1) {
            line.write(b);
            if (prev == '\r' && b == '\n') {
                byte[] arr = line.toByteArray();
                // quitar \r\n final
                int len = arr.length;
                if (len >= 2) {
                    return new String(arr, 0, len - 2, StandardCharsets.US_ASCII);
                }
                return "";
            }
            prev = b;
        }
        return null;
    }

    // clase interna para representar un trabajo de URL pendiente
    private static class UrlJob {
        final URI url;
        final int depth;
        UrlJob(URI url, int depth) { this.url = url; this.depth = depth; }
    }

    // clase interna para el contexto de cada conexion
    private static class ConnCtx {
        final UrlJob job;
        final SocketChannel channel;
        final long deadlineMs;

        SelectionKey key;
        ByteBuffer requestBuf;
        final ByteBuffer readBuf = ByteBuffer.allocate(8192);
        final ByteArrayOutputStream received = new ByteArrayOutputStream();

        ConnCtx(UrlJob job, SocketChannel channel, long deadlineMs) {
            this.job = job;
            this.channel = channel;
            this.deadlineMs = deadlineMs;
        }
    }
}