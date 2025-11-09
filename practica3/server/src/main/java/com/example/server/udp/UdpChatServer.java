package com.example.server.udp;

import com.example.server.core.ChatState;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

@Component
public class UdpChatServer {

    private static final int PORT = 5000;
    private static final int BUFFER_SIZE = 4096;

    private final ChatState chatState;
    private DatagramSocket socket;
    private volatile boolean running = true;

    public UdpChatServer(ChatState chatState) {
        this.chatState = chatState;
    }

    @PostConstruct
    public void start() {
        new Thread(this::run, "udp-chat-server").start();
    }

    private void run() {
        try {
            socket = new DatagramSocket(PORT);
            System.out.println("[UDP] Escuchando en puerto " + PORT);

            byte[] buf = new byte[BUFFER_SIZE];

            while (running) {
                DatagramPacket packet = new DatagramPacket(buf, buf.length);
                socket.receive(packet);

                DatagramPacket copy = copyOf(packet);
                new Thread(() -> handlePacket(copy), "udp-handler").start();
            }
        } catch (IOException e) {
            if (running) e.printStackTrace();
        }
    }

    private DatagramPacket copyOf(DatagramPacket p) {
        byte[] data = new byte[p.getLength()];
        System.arraycopy(p.getData(), p.getOffset(), data, 0, p.getLength());
        return new DatagramPacket(data, data.length, p.getAddress(), p.getPort());
    }

    private void handlePacket(DatagramPacket packet) {
        String raw = new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8).trim();
        InetSocketAddress sender = new InetSocketAddress(packet.getAddress(), packet.getPort());
        if (raw.isEmpty()) return;

        String[] parts = raw.split(" ", 4);
        String cmd = parts[0].toUpperCase(Locale.ROOT);

        try {
            switch (cmd) {
                case "LOGIN" -> handleLogin(parts, sender);
                case "CREATE" -> handleCreate(parts, sender);
                case "JOIN" -> handleJoin(parts, sender);
                case "LEAVE" -> handleLeave(parts, sender);
                case "MSG" -> handleMsg(raw, sender);
                case "PRIV" -> handlePriv(raw, sender);
                case "LIST" -> handleList(parts, sender);
                case "STK" -> handleSticker(raw, sender);
                case "AUD" -> handleAudio(raw, sender);
                default -> send("ERR Comando no reconocido: " + cmd, sender);
            }
        } catch (Exception e) {
            send("ERR " + e.getMessage(), sender);
        }
    }

    // LOGIN <user>
    private void handleLogin(String[] parts, InetSocketAddress sender) {
        if (parts.length < 2) {
            send("ERR Uso: LOGIN <usuario>", sender);
            return;
        }
        String username = parts[1];
        chatState.registerUdpUser(username, sender);
        send("OK LOGIN " + username, sender);
    }

    private void handleCreate(String[] parts, InetSocketAddress sender) {
        if (parts.length < 2) {
            send("ERR Uso: CREATE <sala>", sender);
            return;
        }
        String room = parts[1];
        chatState.createRoom(room);
        send("OK CREATE " + room, sender);
    }

    private void handleJoin(String[] parts, InetSocketAddress sender) {
        if (parts.length < 3) {
            send("ERR Uso: JOIN <sala> <usuario>", sender);
            return;
        }
        String room = parts[1];
        String user = parts[2];
        chatState.joinRoom(user, room);
        broadcastUsers(room);
        broadcast(room, "SYS " + user + " entro a " + room);
    }

    private void handleLeave(String[] parts, InetSocketAddress sender) {
        if (parts.length < 3) {
            send("ERR Uso: LEAVE <sala> <usuario>", sender);
            return;
        }
        String room = parts[1];
        String user = parts[2];
        chatState.leaveRoom(user, room);
        broadcastUsers(room);
        broadcast(room, "SYS " + user + " salio de " + room);
    }

    private void handleMsg(String raw, InetSocketAddress sender) {
        String[] p = raw.split(" ", 4);
        if (p.length < 4) {
            send("ERR Uso: MSG <sala> <usuario> <texto>", sender);
            return;
        }
        String room = p[1];
        String from = p[2];
        String text = p[3];
        broadcast(room, "MSG " + room + " " + from + " " + text);
    }

    private void handlePriv(String raw, InetSocketAddress sender) {
        String[] p = raw.split(" ", 5);
        if (p.length < 5) {
            send("ERR Uso: PRIV <sala> <de> <para> <texto>", sender);
            return;
        }
        String room = p[1];
        String from = p[2];
        String to = p[3];
        String text = p[4];

        InetSocketAddress target = chatState.getUdpUser(to);
        if (target == null) {
            send("ERR Usuario no encontrado: " + to, sender);
            return;
        }
        String msg = "PRIV " + room + " " + from + " " + to + " " + text;
        send(msg, target);
        send(msg, sender);
    }

    private void handleList(String[] parts, InetSocketAddress sender) {
        if (parts.length < 2) {
            send("ERR Uso: LIST <sala>", sender);
            return;
        }
        String room = parts[1];
        Set<String> users = Set.copyOf(chatState.usersOfRoom(room));
        send("USERS " + room + " " + String.join(",", users), sender);
    }

    private void handleSticker(String raw, InetSocketAddress sender) {
        String[] p = raw.split(" ", 4);
        if (p.length < 4) {
            send("ERR Uso: STK <sala> <usuario> <sticker>", sender);
            return;
        }
        String room = p[1];
        String from = p[2];
        String sticker = p[3];
        broadcast(room, "STK " + room + " " + from + " " + sticker);
    }

    private void handleAudio(String raw, InetSocketAddress sender) {
        String[] p = raw.split(" ", 4);
        if (p.length < 4) {
            send("ERR Uso: AUD <sala> <usuario> <label>", sender);
            return;
        }
        String room = p[1];
        String from = p[2];
        String label = p[3];
        broadcast(room, "AUD " + room + " " + from + " " + label);
    }

    private void broadcast(String room, String msg) {
        byte[] data = msg.getBytes(StandardCharsets.UTF_8);
        for (String user : chatState.usersOfRoom(room)) {
            InetSocketAddress addr = chatState.getUdpUser(user);
            if (addr != null) {
                send(data, addr);
            }
        }
    }

    private void broadcastUsers(String room) {
        String payload = "USERS " + room + " " + String.join(",", chatState.usersInRoom(room));
        for (String user : chatState.usersOfRoom(room)) {
            InetSocketAddress addr = chatState.getUdpUser(user);
            if (addr != null) {
                send(payload, addr);
            }
        }
    }

    private void send(String msg, InetSocketAddress target) {
        send(msg.getBytes(StandardCharsets.UTF_8), target);
    }

    private void send(byte[] data, InetSocketAddress target) {
        try {
            DatagramPacket packet = new DatagramPacket(
                    data, data.length, target.getAddress(), target.getPort());
            socket.send(packet);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
