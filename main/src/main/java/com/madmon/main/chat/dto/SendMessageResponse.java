package com.madmon.main.chat.dto;

public record SendMessageResponse(
        ChatMessageResponse userMessage,
        ChatMessageResponse assistantMessage
) {
}
