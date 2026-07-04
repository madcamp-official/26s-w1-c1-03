package com.madmon.main.chat.entity;

import com.madmon.main.user.entity.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "chat_cards",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_chat_cards_session_target", columnNames = {"session_id", "target_user_id"})
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    private ChatCard(ChatSession session, User targetUser) {
        this.session = session;
        this.targetUser = targetUser;
    }

    public static ChatCard create(ChatSession session, User targetUser) {
        return new ChatCard(session, targetUser);
    }
}
