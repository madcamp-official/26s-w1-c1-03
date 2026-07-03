package com.madmon.main.chat.repository;

import com.madmon.main.chat.entity.ChatSession;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
