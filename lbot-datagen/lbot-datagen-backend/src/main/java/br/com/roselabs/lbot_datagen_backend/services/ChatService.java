package br.com.roselabs.lbot_datagen_backend.services;

import br.com.roselabs.lbot_datagen_backend.entities.Chat;
import br.com.roselabs.lbot_datagen_backend.repositories.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;

    @Transactional
    public Chat createChat() {
        Chat chat = Chat.builder()
                .createdAt(LocalDateTime.now())
                .build();
        return chatRepository.save(chat);
    }

    @Transactional(readOnly = true)
    public Optional<Chat> findById(UUID id) {
        return chatRepository.findById(id);
    }

}