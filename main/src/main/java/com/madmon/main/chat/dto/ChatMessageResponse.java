package com.madmon.main.chat.dto;

import com.madmon.main.chat.entity.ChatMessageRole;
import java.time.Instant;

public record ChatMessageResponse(
        Long id,
        ChatMessageRole role,
        String content,
        Instant createdAt
) {
}
