package org.example;

import java.net.URI;
import java.nio.file.Path;

public class DownloadConfig {
    public final URI startUrl;
    public final int maxDepth;
    public final int maxConnections;     // “hilos” pero ahora son conexiones concurrentes en Selector
    public final boolean sameHostOnly;
    public final Path outputDir;
    public final int timeoutMs;          // timeout por descarga (aprox)

    public DownloadConfig(URI startUrl, int maxDepth, int maxConnections, boolean sameHostOnly, Path outputDir, int timeoutMs) {
        this.startUrl = startUrl;
        this.maxDepth = maxDepth;
        this.maxConnections = maxConnections;
        this.sameHostOnly = sameHostOnly;
        this.outputDir = outputDir;
        this.timeoutMs = timeoutMs;
    }
}
