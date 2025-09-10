package br.com.roselabs.lbot_datagen_backend.dtos;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageDto {

    private String prompt;
    private String output;
    private UUID chatId;
}