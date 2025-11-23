package br.com.roselabs.lbot_datagen_backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateVirtualControlSessionDTO {

    private String movementDescription;
    private String lbmlCommand;
    private List<CreateVirtualControlCommandDTO> commands;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateVirtualControlCommandDTO {
        private String commandType;
        private Integer value;
        private String direction;
        private String description;
        private Integer sequenceOrder;
    }
}
