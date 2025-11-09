package com.example.server.config;

import com.example.server.core.ChatState;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatConfig {

    @Bean
    public ChatState chatState() {
        return new ChatState();
    }
}
