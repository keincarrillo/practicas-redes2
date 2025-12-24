package org.example;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

public class PathUtils {

    // obtener el host sin el prefijo www
    public static String hostNoWww(String host) {
        if (host == null) return "";
        host = host.toLowerCase();
        if (host.startsWith("www.")) host = host.substring(4);
        return host;
    }

    // verificar si una ruta tiene extension de archivo
    public static boolean hasExtension(String path) {
        int slash = path.lastIndexOf('/');
        int dot = path.lastIndexOf('.');
        return dot > slash;
    }

    // convertir una URI a una ruta local en el sistema de archivos
    public static Path localPath(Path outDir, URI uri, boolean isHtml) {
        String host = hostNoWww(uri.getHost());
        String path = uri.getPath();
        if (path == null || path.isEmpty()) path = "/";

        // limpiar fragment y query si existen
        int q = path.indexOf('?');
        if (q >= 0) path = path.substring(0, q);
        int h = path.indexOf('#');
        if (h >= 0) path = path.substring(0, h);

        // agregar index.html si termina en /
        if (path.endsWith("/")) {
            path += "index.html";
        } else {
            // agregar extension .html si es HTML y no tiene extension
            if (isHtml && !hasExtension(path)) {
                path += ".html";
            }
        }

        // normalizar barras
        path = path.replace("\\", "/");
        while (path.contains("//")) path = path.replace("//", "/");

        // construir ruta relativa sin iniciar con /
        String rel = path.startsWith("/") ? path.substring(1) : path;

        Path p = outDir.resolve(host).resolve(rel).normalize();

        // verificacion de seguridad: si la ruta sale del directorio base, redirigir a index.html
        if (!p.startsWith(outDir.normalize())) {
            p = outDir.resolve(host).resolve("index.html").normalize();
        }

        return p;
    }

    // convertir una ruta del sistema de archivos a formato de navegador
    public static String toBrowserPath(Path p) {
        return p.toString().replace("\\", "/");
    }

    // determinar si una URL probablemente es HTML basandose en su ruta
    public static String guessHtmlLike(String urlPath) {
        if (urlPath == null || urlPath.isEmpty() || urlPath.endsWith("/")) return "html";
        if (!hasExtension(urlPath)) return "html";
        return "bin";
    }

    // calcular la ruta relativa entre dos archivos
    public static Path relativeLink(Path fromFile, Path toFile) {
        Path fromDir = fromFile.getParent();
        if (fromDir == null) fromDir = Paths.get(".");
        Path rel = fromDir.relativize(toFile);
        return rel;
    }
}