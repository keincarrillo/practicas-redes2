package com.example.server.ws;

import com.example.server.core.ChatState;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.logging.Logger;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatState chatState;
    private final ObjectMapper mapper = new ObjectMapper();

    public ChatWebSocketHandler(ChatState chatState) {
        this.chatState = chatState;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String username = chatState.removeSession(session);
        if (username != null) {
            List<String> rooms = chatState.roomsOfUser(username);
            chatState.leaveAllRooms(username);
            for (String room : rooms) {
                broadcastUsers(room);
                broadcastSystem(room, username + " salió de la sala");
            }
        }
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode root = mapper.readTree(message.getPayload());
        String type = root.path("type").asText(null);
        if (type == null) {
            sendError(session, "Mensaje sin 'type'");
            return;
        }

        switch (type) {
            case "login" -> handleLogin(session, root);
            case "create_room" -> handleCreateRoom(session, root);
            case "join_room" -> handleJoinRoom(session, root);
            case "leave_room" -> handleLeaveRoom(session, root);
            case "message" -> handleMessage(session, root, "message");
            case "private_message" -> handlePrivateMessage(session, root);
            case "sticker" -> handleMessage(session, root, "sticker");
            case "audio" -> handleAudioMessage(session, root);
            default -> sendError(session, "Tipo no soportado: " + type);
        }
    }

    private void handleLogin(WebSocketSession session, JsonNode root) throws IOException {
        String username = root.path("username").asText("").trim();
        if (username.isEmpty()) {
            sendError(session, "Nombre de usuario vacío");
            return;
        }

        chatState.sessionOfUser(username).ifPresent(old -> {
            try {
                old.close(CloseStatus.NORMAL.withReason("Sesión duplicada"));
            } catch (IOException ignored) {}
        });

        chatState.registerSession(session, username);

        send(session, Map.of(
                "type", "login_ok",
                "username", username
        ));

        sendRooms(session);
        broadcastSystem(null, username + " se ha conectado");
    }

    private void handleCreateRoom(WebSocketSession session, JsonNode root) throws IOException {
        if (requireLogin(session) == null) return;

        String room = root.path("room").asText("").trim();
        if (room.isEmpty()) {
            sendError(session, "Nombre de sala vacío");
            return;
        }

        chatState.createRoom(room);
        broadcastRooms();
    }

    private void handleJoinRoom(WebSocketSession session, JsonNode root) throws IOException {
        String username = requireLogin(session);
        if (username == null) return;

        String room = root.path("room").asText("").trim();
        if (room.isEmpty()) {
            sendError(session, "Nombre de sala vacío");
            return;
        }

        chatState.joinRoom(username, room);
        broadcastUsers(room);
        broadcastSystem(room, username + " se unió a la sala");
    }

    private void handleLeaveRoom(WebSocketSession session, JsonNode root) throws IOException {
        String username = requireLogin(session);
        if (username == null) return;

        String room = root.path("room").asText("").trim();
        if (room.isEmpty()) {
            sendError(session, "Nombre de sala vacío");
            return;
        }

        chatState.leaveRoom(username, room);
        broadcastUsers(room);
        broadcastSystem(room, username + " salió de la sala");
    }

    private void handleMessage(WebSocketSession session, JsonNode root, String kind) throws IOException {
        String username = requireLogin(session);
        if (username == null) return;

        String room = root.path("room").asText("").trim();
        String content = root.path("content").asText("").trim();

        if (room.isEmpty() || content.isEmpty()) {
            sendError(session, "Faltan datos para el mensaje");
            return;
        }
        if (!chatState.usersOfRoom(room).contains(username)) {
            sendError(session, "No estás en la sala " + room);
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", kind);
        payload.put("room", room);
        payload.put("from", username);
        payload.put("content", content);

        broadcastToRoom(room, payload);
    }

    private void handleAudioMessage(WebSocketSession session, JsonNode root) throws IOException {
        String username = requireLogin(session);
        if (username == null) return;

        String room = root.path("room").asText("").trim();
        String audioName = root.path("audioName").asText("").trim();
        String audioType = root.path("audioType").asText("").trim();
        String audioData = root.path("audioData").asText("").trim();

        if (room.isEmpty() || audioData.isEmpty()) {
            sendError(session, "Faltan datos para el audio");
            return;
        }
        if (!chatState.usersOfRoom(room).contains(username)) {
            sendError(session, "No estás en la sala " + room);
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "audio");
        payload.put("room", room);
        payload.put("from", username);
        payload.put("audioName", audioName);
        payload.put("audioType", audioType);
        payload.put("audioData", audioData);
        payload.put("content", audioName); // Para compatibilidad

        broadcastToRoom(room, payload);
    }

    private void handlePrivateMessage(WebSocketSession session, JsonNode root) throws IOException {
        String username = requireLogin(session);
        if (username == null) return;

        String room = root.path("room").asText("").trim();
        String to = root.path("to").asText("").trim();
        String content = root.path("content").asText("").trim();

        if (room.isEmpty() || to.isEmpty() || content.isEmpty()) {
            sendError(session, "Faltan datos para mensaje privado");
            return;
        }
        if (!chatState.usersOfRoom(room).contains(username)) {
            sendError(session, "No estás en la sala " + room);
            return;
        }

        var targetOpt = chatState.sessionOfUser(to);
        if (targetOpt.isEmpty()) {
            sendError(session, "Usuario no conectado: " + to);
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "private_message");
        payload.put("room", room);
        payload.put("from", username);
        payload.put("to", to);
        payload.put("content", content);

        send(targetOpt.get(), payload);
        send(session, payload);
    }

    private String requireLogin(WebSocketSession session) throws IOException {
        String username = chatState.usernameOf(session);
        if (username == null) {
            sendError(session, "Debes iniciar sesión primero");
        }
        return username;
    }

    private void sendError(WebSocketSession session, String msg) throws IOException {
        send(session, Map.of("type", "error", "content", msg));
    }

    private void send(WebSocketSession session, Map<String, ?> payload) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
        }
    }

    private void broadcastToRoom(String room, Map<String, ?> payload) throws IOException {
        String json = mapper.writeValueAsString(payload);
        TextMessage text = new TextMessage(json);
        for (WebSocketSession s : chatState.sessionsInRoom(room)) {
            if (s.isOpen()) s.sendMessage(text);
        }
    }

    private void broadcastSystem(String roomOrNull, String text) throws IOException {
        Map<String, Object> base = new LinkedHashMap<>();
        base.put("type", "system");
        base.put("content", text);

        if (roomOrNull != null) {
            base.put("room", roomOrNull);
            broadcastToRoom(roomOrNull, base);
        } else {
            String json = mapper.writeValueAsString(base);
            TextMessage msg = new TextMessage(json);
            for (WebSocketSession s : chatState.allSessions()) {
                if (s.isOpen()) s.sendMessage(msg);
            }
        }
    }

    private void sendRooms(WebSocketSession session) throws IOException {
        send(session, Map.of(
                "type", "rooms",
                "rooms", new ArrayList<>(chatState.roomNames())
        ));
    }

    private void broadcastRooms() throws IOException {
        Map<String, Object> payload = Map.of(
                "type", "rooms",
                "rooms", new ArrayList<>(chatState.roomNames())
        );
        String json = mapper.writeValueAsString(payload);
        TextMessage msg = new TextMessage(json);
        for (WebSocketSession s : chatState.allSessions()) {
            if (s.isOpen()) s.sendMessage(msg);
        }
    }

    private void broadcastUsers(String room) throws IOException {
        Map<String, Object> payload = Map.of(
                "type", "users",
                "room", room,
                "users", chatState.usersInRoom(room)
        );
        String json = mapper.writeValueAsString(payload);
        TextMessage msg = new TextMessage(json);
        for (WebSocketSession s : chatState.sessionsInRoom(room)) {
            if (s.isOpen()) s.sendMessage(msg);
        }
    }
}