package com.madmon.main.chat.entity;

import com.madmon.main.common.entity.BaseEntity;
import com.madmon.main.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "chat_sessions",
        indexes = {
                @Index(name = "idx_chat_sessions_user_id", columnList = "user_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatSession extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "session_title", nullable = false, length = 100)
    private String sessionTitle;

    private ChatSession(User user, String sessionTitle) {
        this.user = user;
        this.sessionTitle = sessionTitle;
    }

    public static ChatSession create(User user, String sessionTitle) {
        return new ChatSession(user, sessionTitle);
    }

    public void rename(String sessionTitle) {
        this.sessionTitle = sessionTitle;
    }
}
