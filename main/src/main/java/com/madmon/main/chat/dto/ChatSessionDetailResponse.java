package com.madmon.main.chat.dto;

import java.time.Instant;
import java.util.List;

public record ChatSessionDetailResponse(
        Long id,
        String title,
        List<ChatCardBrief> targets,
        List<ChatMessageResponse> messages,
        Instant createdAt
) {
}
