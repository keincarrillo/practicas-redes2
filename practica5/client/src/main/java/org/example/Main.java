package org.example;

import javax.swing.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Main {

    private static final String USER_AGENT = "Mozilla/5.0";
    private static final String OUTPUT_DIR = "Descargas";

    private static final Pattern LINK_PATTERN =
            Pattern.compile("href\\s*=\\s*[\"']?(.*?)[\"'>\\s]", Pattern.CASE_INSENSITIVE);
    private static final Pattern SRC_PATTERN =
            Pattern.compile("src\\s*=\\s*[\"']?(.*?)[\"'>\\s]", Pattern.CASE_INSENSITIVE);
    private static final Pattern CSS_URL_PATTERN =
            Pattern.compile("url\\(['\"]?(.*?)['\"]?\\)", Pattern.CASE_INSENSITIVE);

    private static ExecutorService threadPool;
    private static final Queue<String> urlQueue = new ConcurrentLinkedQueue<>();
    private static final Set<String> downloadedUrls = ConcurrentHashMap.newKeySet();
    private static final Set<String> failedUrls = ConcurrentHashMap.newKeySet();

    private static final AtomicInteger successCount = new AtomicInteger(0);
    private static final AtomicInteger totalAttempts = new AtomicInteger(0);
    private static final AtomicBoolean running = new AtomicBoolean(false);

    private static int maxDepth = 10;
    private static String baseUrl;
    private static String siteFolderName; // host sin www

    private static JTextArea resultArea;
    private static JTextField urlInput;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Aplicación WGET");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setSize(550, 420);

            JPanel panel = new JPanel();
            panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));

            urlInput = new JTextField(30);
            panel.add(new JLabel("Ingrese la URL (solo http/https):"));
            panel.add(urlInput);

            JButton downloadButton = new JButton("Iniciar descarga");
            downloadButton.addActionListener(e -> iniciarDescarga(downloadButton));
            panel.add(downloadButton);

            resultArea = new JTextArea(12, 45);
            resultArea.setEditable(false);
            JScrollPane scrollPane = new JScrollPane(resultArea);
            panel.add(scrollPane);

            frame.add(panel);
            frame.setVisible(true);
        });
    }

    private static void iniciarDescarga(JButton downloadButton) {
        if (!running.compareAndSet(false, true)) {
            log("Ya hay una descarga en curso.\n");
            return;
        }

        downloadButton.setEnabled(false);

        // Reset estado para permitir ejecuciones consecutivas
        urlQueue.clear();
        downloadedUrls.clear();
        failedUrls.clear();
        successCount.set(0);
        totalAttempts.set(0);

        baseUrl = urlInput.getText().trim();
        if (baseUrl.isEmpty()) {
            log("Por favor ingrese una URL válida.\n");
            running.set(false);
            downloadButton.setEnabled(true);
            return;
        }

        // Normaliza esquema si no lo trae
        if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
            baseUrl = "http://" + baseUrl;
        }

        URL urlObj;
        try {
            urlObj = new URL(baseUrl);
            siteFolderName = urlObj.getHost();
            if (siteFolderName == null || siteFolderName.isBlank()) {
                throw new MalformedURLException("Host vacío.");
            }
            if (siteFolderName.startsWith("www.")) siteFolderName = siteFolderName.substring(4);
        } catch (MalformedURLException e) {
            log("URL inválida: " + e.getMessage() + "\n");
            running.set(false);
            downloadButton.setEnabled(true);
            return;
        }

        log("Iniciando descarga de: " + baseUrl + "\n");
        try {
            Files.createDirectories(Paths.get(OUTPUT_DIR, siteFolderName));
        } catch (IOException e) {
            log("Error al crear el directorio de salida: " + e.getMessage() + "\n");
            running.set(false);
            downloadButton.setEnabled(true);
            return;
        }

        // Ejecutar todo en background para NO congelar Swing
        SwingWorker<Void, String> worker = new SwingWorker<>() {
            @Override
            protected Void doInBackground() {
                int threadCount = 25;
                maxDepth = 10;

                threadPool = Executors.newFixedThreadPool(threadCount);
                urlQueue.add(baseUrl + "|0");

                while (true) {
                    String urlWithDepth = urlQueue.poll();
                    if (urlWithDepth != null) {
                        threadPool.execute(() -> processUrl(urlWithDepth));
                    } else {
                        // Si no hay cola y no hay hilos activos, terminamos
                        if (getActiveCount() == 0) break;
                        try {
                            Thread.sleep(60);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                }

                threadPool.shutdown();
                try {
                    threadPool.awaitTermination(3, TimeUnit.MINUTES);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }

                return null;
            }

            @Override
            protected void done() {
                log("\n=== Resumen Final ===\n");
                log("Total de archivos intentados: " + totalAttempts.get() + "\n");
                log("Descargas exitosas: " + successCount.get() + "\n");
                if (!failedUrls.isEmpty()) {
                    log("Fallidos: " + failedUrls.size() + "\n");
                }
                running.set(false);
                downloadButton.setEnabled(true);
            }
        };

        worker.execute();
    }

    private static int getActiveCount() {
        if (threadPool instanceof ThreadPoolExecutor) {
            return ((ThreadPoolExecutor) threadPool).getActiveCount();
        }
        return 0;
    }

    private static void processUrl(String urlWithDepth) {
        String[] parts = urlWithDepth.split("\\|", 2);
        String url = parts[0];
        int depth = Integer.parseInt(parts[1]);

        // evita duplicados de forma concurrente
        if (!downloadedUrls.add(url)) return;

        totalAttempts.incrementAndGet();
        log("Descargando: " + url + "\n");

        HttpURLConnection connection = null;
        try {
            URL urlObj = new URL(url);

            // (Opcional) limitar al mismo host para no irse a otros dominios
            String host = urlObj.getHost();
            if (host != null && host.startsWith("www.")) host = host.substring(4);
            if (host == null || !host.equalsIgnoreCase(siteFolderName)) {
                return;
            }

            connection = (HttpURLConnection) urlObj.openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", USER_AGENT);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                log("Error al descargar " + url + " - Código: " + responseCode + "\n");
                failedUrls.add(url + " (Código: " + responseCode + ")");
                return;
            }

            String filePath = getLocalFilePath(url);
            File outputFile = new File(filePath);

            File parent = outputFile.getParentFile();
            if (parent != null) parent.mkdirs();

            // Guardar tal cual (binario o texto)
            try (InputStream in = connection.getInputStream();
                 FileOutputStream out = new FileOutputStream(outputFile)) {

                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
            }

            successCount.incrementAndGet();
            log("Guardado como: " + outputFile.getPath() + "\n");

            // Solo parsear/reescribir si es HTML
            String contentType = connection.getContentType();
            boolean isHtml = (contentType != null && contentType.toLowerCase().contains("text/html"))
                    || url.endsWith(".html") || url.endsWith(".htm");

            if (!isHtml) return;

            // Asegurar extensión .html (y actualizar referencia si renombra)
            outputFile = ensureHtmlExtension(outputFile);

            String htmlContent = Files.readString(outputFile.toPath(), StandardCharsets.UTF_8);

            if (depth < maxDepth) {
                processLinks(htmlContent, url, depth);
            }

            String rewritten = rewriteLinks(htmlContent, url, outputFile.getAbsolutePath());
            Files.writeString(outputFile.toPath(), rewritten, StandardCharsets.UTF_8);

        } catch (Exception e) {
            log("Error al procesar " + url + ": " + e.getMessage() + "\n");
            failedUrls.add(url + " (Error: " + e.getMessage() + ")");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static File ensureHtmlExtension(File file) {
        String path = file.getAbsolutePath();
        if (path.endsWith(".html") || path.endsWith(".htm")) return file;

        File newFile = new File(path + ".html");
        if (file.renameTo(newFile)) {
            log("Renombrado a: " + newFile.getPath() + "\n");
            return newFile;
        } else {
            log("No se pudo renombrar el archivo: " + path + "\n");
            return file;
        }
    }

    private static void processLinks(String htmlContent, String pageUrl, int currentDepth) {
        Matcher hrefMatcher = LINK_PATTERN.matcher(htmlContent);
        while (hrefMatcher.find()) {
            processFoundLink(hrefMatcher.group(1), pageUrl, currentDepth);
        }

        Matcher srcMatcher = SRC_PATTERN.matcher(htmlContent);
        while (srcMatcher.find()) {
            processFoundLink(srcMatcher.group(1), pageUrl, currentDepth);
        }

        Matcher cssUrlMatcher = CSS_URL_PATTERN.matcher(htmlContent);
        while (cssUrlMatcher.find()) {
            processFoundLink(cssUrlMatcher.group(1), pageUrl, currentDepth);
        }
    }

    private static void processFoundLink(String link, String pageUrl, int currentDepth) {
        if (link == null) return;
        link = link.trim();
        if (link.isEmpty()) return;

        if (link.startsWith("javascript:") || link.startsWith("mailto:") || link.startsWith("tel:")
                || link.startsWith("#") || link.startsWith("data:")) {
            return;
        }

        try {
            URL absoluteUrl = new URL(new URL(pageUrl), link);
            String normalizedUrl = absoluteUrl.toString().split("#", 2)[0];

            // Limitar al mismo host
            String host = absoluteUrl.getHost();
            if (host != null && host.startsWith("www.")) host = host.substring(4);
            if (host == null || !host.equalsIgnoreCase(siteFolderName)) return;

            if (!downloadedUrls.contains(normalizedUrl)) {
                urlQueue.add(normalizedUrl + "|" + (currentDepth + 1));
            }
        } catch (MalformedURLException e) {
            log("Enlace inválido: " + link + " en " + pageUrl + "\n");
        }
    }

    private static String getLocalFilePath(String url) throws MalformedURLException {
        URL urlObj = new URL(url);

        String path = urlObj.getPath();
        if (path == null || path.isBlank()) path = "/";

        // limpia query/fragment
        path = path.split("\\?", 2)[0].split("#", 2)[0];

        if (path.endsWith("/")) {
            path += "index.html";
        } else {
            String last = path.substring(path.lastIndexOf('/') + 1);
            if (!last.contains(".")) {
                path += ".html";
            }
        }

        // host sin www
        String host = urlObj.getHost();
        if (host != null && host.startsWith("www.")) host = host.substring(4);

        // evitar que empiece con "/"
        if (path.startsWith("/")) path = path.substring(1);

        Path localPath = Paths.get(OUTPUT_DIR, host, path).normalize();
        return localPath.toString();
    }

    private static String rewriteLinks(String htmlContent, String pageUrl, String currentLocalFile) {
        try {
            // href
            Matcher hrefMatcher = LINK_PATTERN.matcher(htmlContent);
            StringBuffer sb = new StringBuffer();
            while (hrefMatcher.find()) {
                String original = hrefMatcher.group(1);
                String repl = convertToLocalLink(original, pageUrl, currentLocalFile);
                hrefMatcher.appendReplacement(sb, "href=\"" + Matcher.quoteReplacement(repl) + "\"");
            }
            hrefMatcher.appendTail(sb);

            // src
            Matcher srcMatcher = SRC_PATTERN.matcher(sb.toString());
            sb = new StringBuffer();
            while (srcMatcher.find()) {
                String original = srcMatcher.group(1);
                String repl = convertToLocalLink(original, pageUrl, currentLocalFile);
                srcMatcher.appendReplacement(sb, "src=\"" + Matcher.quoteReplacement(repl) + "\"");
            }
            srcMatcher.appendTail(sb);

            // url(...) dentro del HTML (inline styles)
            Matcher cssMatcher = CSS_URL_PATTERN.matcher(sb.toString());
            sb = new StringBuffer();
            while (cssMatcher.find()) {
                String original = cssMatcher.group(1);
                String repl = convertToLocalLink(original, pageUrl, currentLocalFile);
                cssMatcher.appendReplacement(sb, "url('" + Matcher.quoteReplacement(repl) + "')");
            }
            cssMatcher.appendTail(sb);

            return sb.toString();
        } catch (Exception e) {
            log("No se pudo reescribir links: " + e.getMessage() + "\n");
            return htmlContent;
        }
    }

    private static String convertToLocalLink(String originalLink, String pageUrl, String currentLocalFile)
            throws MalformedURLException {

        if (originalLink == null) return "";
        String link = originalLink.trim();

        if (link.startsWith("javascript:") || link.startsWith("mailto:") || link.startsWith("#")
                || link.startsWith("tel:") || link.startsWith("data:")) {
            return originalLink;
        }

        URL resolved = new URL(new URL(pageUrl), link);

        // solo reescribir si es del mismo host
        String host = resolved.getHost();
        if (host != null && host.startsWith("www.")) host = host.substring(4);
        if (host == null || !host.equalsIgnoreCase(siteFolderName)) {
            return originalLink;
        }

        String destinationLocal = getLocalFilePath(resolved.toString());
        Path destinationPath = Paths.get(destinationLocal).normalize();

        Path sourceDir = Paths.get(currentLocalFile).getParent();
        if (sourceDir == null) return destinationPath.getFileName().toString();

        Path relative = sourceDir.relativize(destinationPath);
        return relative.toString().replace("\\", "/");
    }

    private static void log(String msg) {
        SwingUtilities.invokeLater(() -> resultArea.append(msg));
    }
}
