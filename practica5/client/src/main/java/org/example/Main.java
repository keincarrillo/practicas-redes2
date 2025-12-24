package org.example;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

public class Main {

    private volatile CrawlEngine engine;

    private JTextField urlField;
    private JSpinner depthSpinner;
    private JSpinner connSpinner;
    private JCheckBox sameHostCheck;
    private JTextField outDirField;
    private JTextArea logArea;
    private JLabel statusLabel;
    private JLabel progressLabel;
    private JButton startBtn;
    private JButton stopBtn;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new Main().showUI());
    }

    private void showUI() {
        JFrame frame = new JFrame("Aplicacion WGET");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(780, 540);
        frame.setLocationRelativeTo(null);
        frame.setLayout(new BorderLayout(10, 10));

        JPanel root = new JPanel(new BorderLayout(10, 10));
        root.setBorder(new EmptyBorder(10, 10, 10, 10));
        frame.setContentPane(root);

        root.add(buildTopPanel(), BorderLayout.NORTH);
        root.add(buildCenterPanel(), BorderLayout.CENTER);
        root.add(buildBottomPanel(), BorderLayout.SOUTH);

        setRunning(false);
        frame.setVisible(true);
    }

    private JPanel buildTopPanel() {
        JPanel p = new JPanel(new GridBagLayout());
        p.setBorder(BorderFactory.createTitledBorder("Configuracion"));

        GridBagConstraints c = new GridBagConstraints();
        c.insets = new Insets(6, 6, 6, 6);
        c.fill = GridBagConstraints.HORIZONTAL;

        urlField = new JTextField("http://example.com/");
        depthSpinner = new JSpinner(new SpinnerNumberModel(2, 0, 20, 1));
        connSpinner = new JSpinner(new SpinnerNumberModel(8, 1, 64, 1));
        sameHostCheck = new JCheckBox("Solo mismo host", true);

        Path def = Paths.get(System.getProperty("user.home"), "DescargasWget");
        outDirField = new JTextField(def.toString());
        outDirField.setEditable(false);

        JButton browse = new JButton("Elegir carpeta...");
        browse.addActionListener(e -> chooseFolder());

        startBtn = new JButton("Iniciar");
        stopBtn = new JButton("Detener");

        startBtn.addActionListener(e -> onStart());
        stopBtn.addActionListener(e -> onStop());

        int y = 0;

        c.gridx = 0; c.gridy = y; c.weightx = 0; p.add(new JLabel("URL (solo http://):"), c);
        c.gridx = 1; c.gridy = y; c.weightx = 1; p.add(urlField, c);
        c.gridx = 2; c.gridy = y; c.weightx = 0; p.add(new JLabel("Profundidad:"), c);
        c.gridx = 3; c.gridy = y; c.weightx = 0; p.add(depthSpinner, c);

        y++;
        c.gridx = 0; c.gridy = y; c.weightx = 0; p.add(new JLabel("Conexiones:"), c);
        c.gridx = 1; c.gridy = y; c.weightx = 0; p.add(connSpinner, c);
        c.gridx = 2; c.gridy = y; c.weightx = 0; p.add(sameHostCheck, c);
        c.gridx = 3; c.gridy = y; c.weightx = 0; p.add(new JLabel(""), c);

        y++;
        c.gridx = 0; c.gridy = y; c.weightx = 0; p.add(new JLabel("Salida:"), c);
        c.gridx = 1; c.gridy = y; c.weightx = 1; p.add(outDirField, c);
        c.gridx = 2; c.gridy = y; c.weightx = 0; p.add(browse, c);

        JPanel btns = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        btns.add(startBtn);
        btns.add(stopBtn);

        c.gridx = 3; c.gridy = y; c.weightx = 0;
        p.add(btns, c);

        return p;
    }

    private JScrollPane buildCenterPanel() {
        logArea = new JTextArea();
        logArea.setEditable(false);
        logArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        return new JScrollPane(logArea);
    }

    private JPanel buildBottomPanel() {
        JPanel p = new JPanel(new BorderLayout(10, 0));
        statusLabel = new JLabel("Listo");
        progressLabel = new JLabel("Intentados: 0 | OK: 0 | Fallidos: 0 | Cola: 0 | En vuelo: 0");
        p.add(statusLabel, BorderLayout.WEST);
        p.add(progressLabel, BorderLayout.CENTER);
        return p;
    }

    private void chooseFolder() {
        JFileChooser fc = new JFileChooser();
        fc.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        fc.setDialogTitle("Selecciona carpeta de salida");
        int r = fc.showOpenDialog(null);
        if (r == JFileChooser.APPROVE_OPTION) {
            outDirField.setText(fc.getSelectedFile().toPath().toString());
        }
    }

    private void onStart() {
        String urlText = urlField.getText().trim();
        if (urlText.isEmpty()) {
            append("Por favor ingresa una URL.\n");
            return;
        }
        if (urlText.startsWith("https://")) {
            append("[ADVERTENCIA] Esta version NIO no bloqueante soporta solo http:// (HTTPS requiere SSLEngine).\n");
            return;
        }

        try {
            URI start = URI.create(urlText);

            int depth = (Integer) depthSpinner.getValue();
            int conns = (Integer) connSpinner.getValue();
            boolean sameHost = sameHostCheck.isSelected();
            Path outDir = Paths.get(outDirField.getText().trim());

            DownloadConfig cfg = new DownloadConfig(start, depth, conns, sameHost, outDir, 20000);

            logArea.setText("");
            append("Configuracion:\n");
            append("  URL: " + cfg.startUrl + "\n");
            append("  Profundidad: " + cfg.maxDepth + "\n");
            append("  Conexiones: " + cfg.maxConnections + "\n");
            append("  Solo host: " + cfg.sameHostOnly + "\n");
            append("  Salida: " + cfg.outputDir + "\n\n");

            engine = new CrawlEngine(new SwingListener());
            setRunning(true);
            engine.start(cfg);

        } catch (Exception ex) {
            append("URL invalida: " + ex.getMessage() + "\n");
        }
    }

    private void onStop() {
        if (engine != null) engine.stop();
        append("[STOP] Deteniendo...\n");
    }

    private void setRunning(boolean isRunning) {
        startBtn.setEnabled(!isRunning);
        stopBtn.setEnabled(isRunning);
        urlField.setEnabled(!isRunning);
        depthSpinner.setEnabled(!isRunning);
        connSpinner.setEnabled(!isRunning);
        sameHostCheck.setEnabled(!isRunning);
    }

    private void append(String text) {
        logArea.append(text);
        logArea.setCaretPosition(logArea.getDocument().getLength());
    }

    // implementacion de EngineListener para actualizar la interfaz
    private class SwingListener implements EngineListener {
        @Override public void onLog(String text) {
            SwingUtilities.invokeLater(() -> append(text));
        }
        @Override public void onStatus(String text) {
            SwingUtilities.invokeLater(() -> statusLabel.setText(text));
        }
        @Override public void onProgress(int attempted, int ok, int failed, int queued, int inFlight) {
            SwingUtilities.invokeLater(() ->
                    progressLabel.setText("Intentados: " + attempted +
                            " | OK: " + ok +
                            " | Fallidos: " + failed +
                            " | Cola: " + queued +
                            " | En vuelo: " + inFlight)
            );
        }
        @Override public void onFinished(int attempted, int ok, int failed, Path outputDir) {
            SwingUtilities.invokeLater(() -> {
                setRunning(false);
                append("\n== Resumen ==\n");
                append("Intentados: " + attempted + "\n");
                append("OK: " + ok + "\n");
                append("Fallidos: " + failed + "\n");
                append("Salida: " + outputDir + "\n");
            });
        }
    }
}