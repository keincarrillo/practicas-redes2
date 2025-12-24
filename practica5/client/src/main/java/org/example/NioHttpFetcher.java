package org.example;

import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class NioHttpFetcher {

    public static class Result {
        public final int statusCode;
        public final Map<String, String> headers;
        public final byte[] body;

        public Result(int statusCode, Map<String, String> headers, byte[] body) {
            this.statusCode = statusCode;
            this.headers = headers;
            this.body = body;
        }
    }

    public static Result fetch(URI uri, int timeoutMs) throws Exception {
        if (!"http".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("NIO fetch soporta solo http:// (no https://).");
        }

        String host = uri.getHost();
        int port = (uri.getPort() == -1) ? 80 : uri.getPort();

        String path = (uri.getRawPath() == null || uri.getRawPath().isEmpty()) ? "/" : uri.getRawPath();
        if (uri.getRawQuery() != null) path += "?" + uri.getRawQuery();

        String req =
                "GET " + path + " HTTP/1.1\r\n" +
                        "Host: " + host + "\r\n" +
                        "User-Agent: Mozilla/5.0\r\n" +
                        "Accept: */*\r\n" +
                        "Connection: close\r\n" +     // clave: leemos hasta EOF
                        "\r\n";

        ByteBuffer writeBuf = ByteBuffer.wrap(req.getBytes(StandardCharsets.US_ASCII));
        ByteBuffer readBuf = ByteBuffer.allocate(8192);
        ByteArrayOutputStream received = new ByteArrayOutputStream();

        long deadline = System.currentTimeMillis() + timeoutMs;

        try (Selector selector = Selector.open();
             SocketChannel ch = SocketChannel.open()) {

            ch.configureBlocking(false);
            ch.connect(new InetSocketAddress(host, port));
            ch.register(selector, SelectionKey.OP_CONNECT);

            boolean done = false;
            while (!done) {
                if (System.currentTimeMillis() > deadline) {
                    throw new SocketTimeoutException("Timeout NIO leyendo " + uri);
                }

                selector.select(200);

                Iterator<SelectionKey> it = selector.selectedKeys().iterator();
                while (it.hasNext()) {
                    SelectionKey key = it.next();
                    it.remove();

                    SocketChannel sc = (SocketChannel) key.channel();

                    if (key.isConnectable()) {
                        if (sc.finishConnect()) {
                            key.interestOps(SelectionKey.OP_WRITE);
                        }
                    }

                    if (key.isWritable()) {
                        sc.write(writeBuf);
                        if (!writeBuf.hasRemaining()) {
                            key.interestOps(SelectionKey.OP_READ);
                        }
                    }

                    if (key.isReadable()) {
                        int n = sc.read(readBuf);
                        if (n == -1) { // EOF
                            done = true;
                            break;
                        }
                        if (n > 0) {
                            readBuf.flip();
                            received.write(readBuf.array(), 0, readBuf.limit());
                            readBuf.clear();
                        }
                    }
                }
            }
        }

        byte[] all = received.toByteArray();

        int split = indexOf(all, "\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
        if (split < 0) throw new IOException("Respuesta HTTP inválida (sin headers).");

        byte[] headerBytes = Arrays.copyOfRange(all, 0, split);
        byte[] bodyBytes = Arrays.copyOfRange(all, split + 4, all.length);

        String headerText = new String(headerBytes, StandardCharsets.ISO_8859_1);
        String[] lines = headerText.split("\r\n");
        int statusCode = parseStatus(lines.length > 0 ? lines[0] : "");

        Map<String, String> headers = new HashMap<>();
        for (int i = 1; i < lines.length; i++) {
            int idx = lines[i].indexOf(':');
            if (idx > 0) {
                String k = lines[i].substring(0, idx).trim().toLowerCase();
                String v = lines[i].substring(idx + 1).trim();
                headers.put(k, v);
            }
        }

        // Si viene chunked, decodifica
        String te = headers.getOrDefault("transfer-encoding", "").toLowerCase();
        if (te.contains("chunked")) {
            bodyBytes = decodeChunked(bodyBytes);
        }

        return new Result(statusCode, headers, bodyBytes);
    }

    private static int parseStatus(String statusLine) {
        // HTTP/1.1 200 OK
        try {
            String[] p = statusLine.split(" ");
            return Integer.parseInt(p[1].trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private static int indexOf(byte[] data, byte[] pattern) {
        outer:
        for (int i = 0; i <= data.length - pattern.length; i++) {
            for (int j = 0; j < pattern.length; j++) {
                if (data[i + j] != pattern[j]) continue outer;
            }
            return i;
        }
        return -1;
    }

    private static byte[] decodeChunked(byte[] chunked) throws IOException {
        ByteArrayInputStream in = new ByteArrayInputStream(chunked);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        while (true) {
            String line = readLineCRLF(in);
            if (line == null) break;

            line = line.trim();
            if (line.isEmpty()) continue;

            int semicolon = line.indexOf(';');
            String sizeHex = (semicolon >= 0) ? line.substring(0, semicolon) : line;

            int size = Integer.parseInt(sizeHex.trim(), 16);
            if (size == 0) {
                // consume trailer CRLF (y posibles trailers)
                // leemos hasta una línea vacía
                while (true) {
                    String trailer = readLineCRLF(in);
                    if (trailer == null || trailer.isEmpty()) break;
                }
                break;
            }

            byte[] buf = in.readNBytes(size);
            out.write(buf);

            // consume CRLF después del chunk
            in.read(); // \r
            in.read(); // \n
        }

        return out.toByteArray();
    }

    private static String readLineCRLF(InputStream in) throws IOException {
        ByteArrayOutputStream line = new ByteArrayOutputStream();
        int prev = -1;
        int b;
        while ((b = in.read()) != -1) {
            if (prev == '\r' && b == '\n') {
                byte[] arr = line.toByteArray();
                // quitar el \r final
                if (arr.length > 0 && arr[arr.length - 1] == '\r') {
                    arr = Arrays.copyOf(arr, arr.length - 1);
                }
                return new String(arr, StandardCharsets.US_ASCII);
            }
            line.write(b);
            prev = b;
        }
        return null;
    }
}
