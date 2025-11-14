package com.example.server.service;

import com.example.server.core.ChatState;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;

@Service
public class AudioTransferService {

    private static final int CHUNK_SIZE = 32768; // 32KB por paquete (mejor para archivos grandes)
    private static final int WINDOW_SIZE = 10; 
    private static final long TIMEOUT_MS = 2000; // 2 segundos de timeout

    private final ChatState chatState;
    private final ObjectMapper mapper = new ObjectMapper();

    private final Map<String, AudioTransferState> activeTransfers = new ConcurrentHashMap<>();

    public AudioTransferService(ChatState chatState) {
        this.chatState = chatState;
    }

    public void startAudioTransfer(WebSocketSession sender, String room,
                                   String audioName, String audioType, String base64Data) {

        String transferId = UUID.randomUUID().toString();
        byte[] audioBytes = Base64.getDecoder().decode(base64Data);

        // Dividir en chunks
        List<byte[]> chunks = splitIntoChunks(audioBytes, CHUNK_SIZE);

        AudioTransferState state = new AudioTransferState(
                transferId, sender, room, audioName, audioType, chunks
        );

        activeTransfers.put(transferId, state);

        // Enviar metadata a todos en la sala
        notifyAudioStart(room, sender, transferId, audioName, audioType, chunks.size());

        // Iniciar transferencia en hilo separado
        CompletableFuture.runAsync(() -> sendWithGoBackN(state));
    }

    private void sendWithGoBackN(AudioTransferState state) {
        int base = 0; // Primer paquete no confirmado
        int nextSeq = 0; // Siguiente secuencia a enviar
        int totalPackets = state.chunks.size();

        System.out.println("[AUDIO] Iniciando transferencia: " + state.audioName +
                " (" + totalPackets + " chunks)");

        while (base < totalPackets) {
            // Enviar paquetes dentro de la ventana
            while (nextSeq < totalPackets && nextSeq < base + WINDOW_SIZE) {
                sendChunk(state, nextSeq);
                nextSeq++;
            }

            // Esperar ACK con timeout
            try {
                Integer ack = state.ackQueue.poll(TIMEOUT_MS, TimeUnit.MILLISECONDS);

                if (ack != null && ack >= base) {
                    // ACK recibido, deslizar ventana
                    System.out.println("[AUDIO] ACK recibido para paquete " + ack);
                    base = ack + 1;
                } else {
                    // Timeout o ACK fuera de orden - retransmitir desde base
                    System.out.println("[AUDIO] Timeout en paquete " + base + ", retransmitiendo ventana...");
                    nextSeq = base;
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                System.err.println("[AUDIO] Transferencia interrumpida");
                break;
            }
        }

        System.out.println("[AUDIO] Transferencia completa: " + state.audioName);
        notifyAudioComplete(state);
        activeTransfers.remove(state.transferId);
    }

    private void sendChunk(AudioTransferState state, int seq) {
        try {
            Map<String, Object> packet = new LinkedHashMap<>();
            packet.put("type", "audio_chunk");
            packet.put("transferId", state.transferId);
            packet.put("seq", seq);
            packet.put("total", state.chunks.size());
            packet.put("data", Base64.getEncoder().encodeToString(state.chunks.get(seq)));
            packet.put("isLast", seq == state.chunks.size() - 1);

            String json = mapper.writeValueAsString(packet);
            TextMessage message = new TextMessage(json);

            int sent = 0;
            for (WebSocketSession session : chatState.sessionsInRoom(state.room)) {
                if (session.isOpen() && !session.getId().equals(state.sender.getId())) {
                    session.sendMessage(message);
                    sent++;
                }
            }

            state.lastSentTime.put(seq, System.currentTimeMillis());

            if (seq % 10 == 0) {
                System.out.println("[AUDIO] Enviado chunk " + seq + "/" +
                        state.chunks.size() + " a " + sent + " usuarios");
            }

        } catch (IOException e) {
            System.err.println("[AUDIO] Error enviando chunk " + seq + ": " + e.getMessage());
        }
    }

    public void handleAck(String transferId, int seq) {
        AudioTransferState state = activeTransfers.get(transferId);
        if (state != null) {
            state.ackQueue.offer(seq);
        }
    }
    
    private void notifyAudioStart(String room, WebSocketSession sender,
                                  String transferId, String audioName,
                                  String audioType, int totalChunks) {
        try {
            String username = chatState.usernameOf(sender);

            Map<String, Object> notification = new LinkedHashMap<>();
            notification.put("type", "audio_start");
            notification.put("transferId", transferId);
            notification.put("room", room);
            notification.put("from", username);
            notification.put("audioName", audioName);
            notification.put("audioType", audioType);
            notification.put("totalChunks", totalChunks);

            String json = mapper.writeValueAsString(notification);
            TextMessage message = new TextMessage(json);

            for (WebSocketSession session : chatState.sessionsInRoom(room)) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }

            System.out.println("[AUDIO] Notificación de inicio enviada: " + audioName);

        } catch (IOException e) {
            System.err.println("[AUDIO] Error en notificación de inicio: " + e.getMessage());
        }
    }

    private void notifyAudioComplete(AudioTransferState state) {
        try {
            Map<String, Object> notification = new LinkedHashMap<>();
            notification.put("type", "audio_complete");
            notification.put("transferId", state.transferId);
            notification.put("room", state.room);

            String json = mapper.writeValueAsString(notification);
            TextMessage message = new TextMessage(json);

            for (WebSocketSession session : chatState.sessionsInRoom(state.room)) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }

            System.out.println("[AUDIO] Notificacion de completado enviada");

        } catch (IOException e) {
            System.err.println("[AUDIO] Error en notificacion de completado: " + e.getMessage());
        }
    }

    private List<byte[]> splitIntoChunks(byte[] data, int chunkSize) {
        List<byte[]> chunks = new ArrayList<>();
        int offset = 0;

        while (offset < data.length) {
            int remaining = data.length - offset;
            int size = Math.min(chunkSize, remaining);

            byte[] chunk = new byte[size];
            System.arraycopy(data, offset, chunk, 0, size);
            chunks.add(chunk);

            offset += size;
        }

        System.out.println("[AUDIO] Archivo dividido en " + chunks.size() + " chunks");
        return chunks;
    }

    private static class AudioTransferState {
        final String transferId;
        final WebSocketSession sender;
        final String room;
        final String audioName;
        final String audioType;
        final List<byte[]> chunks;
        final BlockingQueue<Integer> ackQueue = new LinkedBlockingQueue<>();
        final Map<Integer, Long> lastSentTime = new ConcurrentHashMap<>();

        AudioTransferState(String transferId, WebSocketSession sender, String room,
                           String audioName, String audioType, List<byte[]> chunks) {
            this.transferId = transferId;
            this.sender = sender;
            this.room = room;
            this.audioName = audioName;
            this.audioType = audioType;
            this.chunks = chunks;
        }
    }
}