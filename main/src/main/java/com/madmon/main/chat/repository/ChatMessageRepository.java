package com.madmon.main.chat.repository;

import com.madmon.main.chat.entity.ChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findAllBySessionIdOrderByCreatedAtAsc(Long sessionId);
}
