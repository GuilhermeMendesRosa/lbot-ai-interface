package br.com.roselabs.lbot_datagen_backend.dtos;

import br.com.roselabs.lbot_datagen_backend.entities.VirtualControlSession;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VirtualControlSessionDTO {

    private UUID id;
    private LocalDateTime createdAt;
    private String movementDescription;
    private String lbmlCommand;
    private LocalDateTime executedAt;
    private List<VirtualControlCommandDTO> commands;

    public VirtualControlSessionDTO(VirtualControlSession session) {
        this.id = session.getId();
        this.createdAt = session.getCreatedAt();
        this.movementDescription = session.getMovementDescription();
        this.lbmlCommand = session.getLbmlCommand();
        this.executedAt = session.getExecutedAt();
        this.commands = session.getCommands().stream()
                .map(VirtualControlCommandDTO::new)
                .collect(Collectors.toList());
    }
}
