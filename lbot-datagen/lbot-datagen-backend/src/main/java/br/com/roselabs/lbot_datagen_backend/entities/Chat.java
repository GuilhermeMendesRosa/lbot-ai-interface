package br.com.roselabs.lbot_datagen_backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "chats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Chat {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "chat", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Message> messages = new ArrayList<>();

    @Column(name = "observation", columnDefinition = "TEXT")
    @Builder.Default
    private String observation = null;

    public void addMessage(Message message) {
        messages.add(message);
        message.setChat(this);
    }

    public void removeMessage(Message message) {
        messages.remove(message);
        message.setChat(null);
    }
}