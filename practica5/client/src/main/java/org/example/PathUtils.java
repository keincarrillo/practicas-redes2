package org.example;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

public class PathUtils {

    public static String hostNoWww(String host) {
        if (host == null) return "";
        host = host.toLowerCase();
        if (host.startsWith("www.")) host = host.substring(4);
        return host;
    }

    public static boolean hasExtension(String path) {
        int slash = path.lastIndexOf('/');
        int dot = path.lastIndexOf('.');
        return dot > slash;
    }

    public static Path localPath(Path outDir, URI uri, boolean isHtml) {
        String host = hostNoWww(uri.getHost());
        String path = uri.getPath();
        if (path == null || path.isEmpty()) path = "/";

        // limpia fragment/query (por si vinieran aquí)
        int q = path.indexOf('?');
        if (q >= 0) path = path.substring(0, q);
        int h = path.indexOf('#');
        if (h >= 0) path = path.substring(0, h);

        if (path.endsWith("/")) {
            path += "index.html";
        } else {
            if (isHtml && !hasExtension(path)) {
                path += ".html";
            }
        }

        // Evita rutas raras
        path = path.replace("\\", "/");
        while (path.contains("//")) path = path.replace("//", "/");

        // Path relativo sin iniciar en "/"
        String rel = path.startsWith("/") ? path.substring(1) : path;

        Path p = outDir.resolve(host).resolve(rel).normalize();

        // safety: si por alguna razón salió fuera, re-ancora
        if (!p.startsWith(outDir.normalize())) {
            p = outDir.resolve(host).resolve("index.html").normalize();
        }

        return p;
    }

    public static String toBrowserPath(Path p) {
        return p.toString().replace("\\", "/");
    }

    public static String guessHtmlLike(String urlPath) {
        if (urlPath == null || urlPath.isEmpty() || urlPath.endsWith("/")) return "html";
        if (!hasExtension(urlPath)) return "html";
        return "bin";
    }

    public static Path relativeLink(Path fromFile, Path toFile) {
        Path fromDir = fromFile.getParent();
        if (fromDir == null) fromDir = Paths.get(".");
        Path rel = fromDir.relativize(toFile);
        return rel;
    }
}
