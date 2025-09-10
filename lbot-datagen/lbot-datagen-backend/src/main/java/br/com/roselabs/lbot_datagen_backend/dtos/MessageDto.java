package br.com.roselabs.lbot_datagen_backend.dtos;

import br.com.roselabs.lbot_datagen_backend.entities.Message;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {

    private UUID id;
    private String prompt;
    private String normalizedPrompt;
    private String output;
    private Integer grade;
    private UUID chatId;

    public MessageDto(Message message) {
        this.id = message.getId();
        this.normalizedPrompt = message.getNormalizedPrompt();
        this.prompt = message.getPrompt();
        this.output = message.getOutput();
        this.grade = message.getGrade();
        this.chatId = message.getChat().getId();
    }
}
