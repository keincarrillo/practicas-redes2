package org.example;

import java.net.URI;
import java.nio.file.Path;

// clase de configuracion para las descargas del crawler
public class DownloadConfig {
    public final URI startUrl;           // URL inicial del crawl
    public final int maxDepth;           // profundidad maxima de enlaces a seguir
    public final int maxConnections;     // numero maximo de conexiones concurrentes
    public final boolean sameHostOnly;   // si solo seguir enlaces del mismo dominio
    public final Path outputDir;         // directorio de salida para archivos descargados
    public final int timeoutMs;          // timeout por descarga en milisegundos

    public DownloadConfig(URI startUrl, int maxDepth, int maxConnections, boolean sameHostOnly, Path outputDir, int timeoutMs) {
        this.startUrl = startUrl;
        this.maxDepth = maxDepth;
        this.maxConnections = maxConnections;
        this.sameHostOnly = sameHostOnly;
        this.outputDir = outputDir;
        this.timeoutMs = timeoutMs;
    }
}