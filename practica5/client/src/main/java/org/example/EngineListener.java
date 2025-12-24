package org.example;

import java.nio.file.Path;

public interface EngineListener {
    void onLog(String text);
    void onStatus(String text);
    void onProgress(int attempted, int ok, int failed, int queued, int inFlight);
    void onFinished(int attempted, int ok, int failed, Path outputDir);
}
