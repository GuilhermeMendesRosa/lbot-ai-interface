package br.com.roselabs.lbot_datagen_backend.services;

import br.com.roselabs.lbot_datagen_backend.dtos.EvaluateMessageDto;
import br.com.roselabs.lbot_datagen_backend.dtos.MessageDto;
import br.com.roselabs.lbot_datagen_backend.dtos.SendMessageDto;
import br.com.roselabs.lbot_datagen_backend.entities.Chat;
import br.com.roselabs.lbot_datagen_backend.entities.Message;
import br.com.roselabs.lbot_datagen_backend.repositories.MessageRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ChatService chatService;
    private final AIService aiService;
    private final MessageRepository messageRepository;

    @Transactional
    public MessageDto sendMessage(SendMessageDto sendMessageDto) {
        UUID chatId = sendMessageDto.getChatId();
        Chat chat = chatService.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat not found with id: " + chatId));

        String prompt = sendMessageDto.getPrompt();
        String normalizedPrompt = aiService.normalizePromptImCm(prompt);
        String output = aiService.processAndExecuteCommand(sendMessageDto.getPrompt());

        Message message = Message.builder()
                .prompt(prompt)
                .normalizedPrompt(normalizedPrompt)
                .chat(chat)
                .output(output)
                .build();

        messageRepository.save(message);

        return new MessageDto(message);
    }

    @Transactional
    public MessageDto evaluateMessage(EvaluateMessageDto evaluateMessageDto) {
        UUID messageId = evaluateMessageDto.getMessageId();
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("Message not found with id: " + messageId));

        message.setGrade(evaluateMessageDto.getGrade());
        messageRepository.save(message);

        return new MessageDto(message);
    }
}