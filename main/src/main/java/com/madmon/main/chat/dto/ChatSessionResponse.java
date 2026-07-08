package com.madmon.main.chat.dto;

import java.time.Instant;
import java.util.List;

public record ChatSessionResponse(
        Long id,
        String title,
        List<ChatStarBrief> targets,
        Instant createdAt
) {
}
