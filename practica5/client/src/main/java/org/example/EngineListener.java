package org.example;

import java.nio.file.Path;

// interfaz para recibir eventos del motor de crawling
public interface EngineListener {
    // registrar mensaje en el log
    void onLog(String text);

    // actualizar el estado general
    void onStatus(String text);

    // actualizar el progreso de las descargas
    void onProgress(int attempted, int ok, int failed, int queued, int inFlight);

    // notificar cuando el proceso termina
    void onFinished(int attempted, int ok, int failed, Path outputDir);
}