package br.com.roselabs.lbot_datagen_backend.controllers;

import br.com.roselabs.lbot_datagen_backend.entities.Chat;
import br.com.roselabs.lbot_datagen_backend.services.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping
    public ResponseEntity<Chat> createChat() {
        Chat createdChat = chatService.createChat();
        return ResponseEntity.status(HttpStatus.CREATED).body(createdChat);
    }

}