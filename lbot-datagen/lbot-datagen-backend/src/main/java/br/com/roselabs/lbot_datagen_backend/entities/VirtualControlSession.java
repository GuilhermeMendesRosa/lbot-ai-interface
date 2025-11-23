package br.com.roselabs.lbot_datagen_backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "virtual_control_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VirtualControlSession {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "movement_description", columnDefinition = "TEXT")
    private String movementDescription;

    @Column(name = "lbml_command", nullable = false)
    private String lbmlCommand;

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<VirtualControlCommand> commands = new ArrayList<>();

    // Helper methods for bidirectional relationship
    public void addCommand(VirtualControlCommand command) {
        commands.add(command);
        command.setSession(this);
    }

    public void removeCommand(VirtualControlCommand command) {
        commands.remove(command);
        command.setSession(null);
    }


}
