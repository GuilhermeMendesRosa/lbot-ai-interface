package br.com.roselabs.lbot_datagen_backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EvaluateMessageDto {

    private UUID messageId;
    private Integer grade;
}
