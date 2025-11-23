package br.com.roselabs.lbot_datagen_backend.dtos;

import br.com.roselabs.lbot_datagen_backend.entities.VirtualControlCommand;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VirtualControlCommandDTO {

    private UUID id;
    private String commandType;
    private Integer value;
    private String direction;
    private String description;
    private Integer sequenceOrder;

    public VirtualControlCommandDTO(VirtualControlCommand command) {
        this.id = command.getId();
        this.commandType = command.getCommandType();
        this.value = command.getValue();
        this.direction = command.getDirection();
        this.description = command.getDescription();
        this.sequenceOrder = command.getSequenceOrder();
    }
}
