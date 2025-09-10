package br.com.roselabs.lbot_datagen_backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.util.UUID;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "prompt", columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "normalized_prompt", columnDefinition = "TEXT")
    private String normalizedPrompt;

    @Column(name = "output", columnDefinition = "TEXT")
    private String output;

    @Column(name = "grade")
    private Integer grade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private Chat chat;
}