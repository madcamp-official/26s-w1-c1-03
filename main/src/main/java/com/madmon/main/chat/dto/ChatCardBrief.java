package com.madmon.main.chat.dto;

public record ChatCardBrief(
        Long userId,
        String name,
        String profileImageUrl
) {
}
