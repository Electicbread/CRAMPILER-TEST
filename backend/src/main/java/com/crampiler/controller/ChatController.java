package com.crampiler.controller;

import com.crampiler.dto.ChatRequest;
import com.crampiler.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public Map<String, String> chat(@Valid @RequestBody ChatRequest request) {
        return Map.of("reply", chatService.reply(request));
    }
}