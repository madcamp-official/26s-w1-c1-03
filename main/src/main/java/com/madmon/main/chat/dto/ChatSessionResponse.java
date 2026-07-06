package com.madmon.main.chat.dto;

import java.time.Instant;
import java.util.List;

public record ChatSessionResponse(
        Long id,
        String title,
        List<ChatCardBrief> targets,
        Instant createdAt
) {
}
