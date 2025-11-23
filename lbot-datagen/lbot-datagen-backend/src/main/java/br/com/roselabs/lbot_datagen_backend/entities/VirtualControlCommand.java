package br.com.roselabs.lbot_datagen_backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.util.UUID;

@Entity
@Table(name = "virtual_control_commands")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VirtualControlCommand {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "command_type", nullable = false, length = 1)
    private String commandType; // 'D' for Distance, 'R' for Rotation

    @Column(name = "value", nullable = false)
    private Integer value; // Distance in cm or angle in degrees

    @Column(name = "direction", nullable = false, length = 1)
    private String direction; // 'F', 'B', 'L', 'R' for movements; 'L', 'R' for rotations

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private VirtualControlSession session;
}
