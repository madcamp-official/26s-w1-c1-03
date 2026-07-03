package com.madmon.main.chat.repository;

import com.madmon.main.chat.entity.ChatCard;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatCardRepository extends JpaRepository<ChatCard, Long> {

    List<ChatCard> findAllBySessionId(Long sessionId);
}
