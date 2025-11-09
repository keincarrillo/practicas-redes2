package com.example.server.core;

import org.springframework.web.socket.WebSocketSession;

import java.net.InetSocketAddress;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class ChatState {
    private final Map<String, InetSocketAddress> udpUsers = new ConcurrentHashMap<>();

    private final Map<WebSocketSession, String> wsUsers = new ConcurrentHashMap<>();

    private final Map<String, Set<String>> rooms = new ConcurrentHashMap<>();

    public void registerUdpUser(String username, InetSocketAddress address) {
        udpUsers.put(username, address);
    }

    public InetSocketAddress getUdpUser(String username) {
        return udpUsers.get(username);
    }

    public void removeUdpUser(String username) {
        udpUsers.remove(username);
        leaveAllRooms(username);
    }

    public Set<String> allUdpUsernames() {
        return udpUsers.keySet();
    }

    public void registerSession(WebSocketSession session, String username) {
        wsUsers.put(session, username);
    }

    public String removeSession(WebSocketSession session) {
        return wsUsers.remove(session);
    }

    public String usernameOf(WebSocketSession session) {
        return wsUsers.get(session);
    }

    public Set<WebSocketSession> allSessions() {
        return wsUsers.keySet();
    }

    public Optional<WebSocketSession> sessionOfUser(String username) {
        return wsUsers.entrySet()
                .stream()
                .filter(e -> username.equals(e.getValue()))
                .map(Map.Entry::getKey)
                .findFirst();
    }

    public void createRoom(String room) {
        rooms.computeIfAbsent(room, r -> ConcurrentHashMap.newKeySet());
    }

    public Set<String> roomNames() {
        return rooms.keySet();
    }

    public void joinRoom(String username, String room) {
        createRoom(room);
        rooms.get(room).add(username);
    }

    public void leaveRoom(String username, String room) {
        Set<String> set = rooms.get(room);
        if (set != null) {
            set.remove(username);
            if (set.isEmpty()) {
                rooms.remove(room);
            }
        }
    }

    public void leaveAllRooms(String username) {
        rooms.forEach((room, set) -> set.remove(username));
        rooms.entrySet().removeIf(e -> e.getValue().isEmpty());
    }

    public Set<String> usersOfRoom(String room) {
        return rooms.getOrDefault(room, Set.of());
    }

    public List<String> usersInRoom(String room) {
        return new ArrayList<>(usersOfRoom(room));
    }

    public List<String> roomsOfUser(String username) {
        List<String> result = new ArrayList<>();
        rooms.forEach((room, set) -> {
            if (set.contains(username)) {
                result.add(room);
            }
        });
        return result;
    }

    public Set<WebSocketSession> sessionsInRoom(String room) {
        Set<String> users = usersOfRoom(room);
        Set<WebSocketSession> result = new HashSet<>();
        wsUsers.forEach((session, username) -> {
            if (users.contains(username)) {
                result.add(session);
            }
        });
        return result;
    }
}
