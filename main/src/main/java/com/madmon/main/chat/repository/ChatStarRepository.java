package com.madmon.main.chat.repository;

import com.madmon.main.chat.entity.ChatStar;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatStarRepository extends JpaRepository<ChatStar, Long> {

    List<ChatStar> findAllBySessionId(Long sessionId);
}
