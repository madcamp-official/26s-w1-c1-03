package com.madmon.main.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank(message = "질문을 입력해주세요.")
        @Size(min = 2, max = 2000, message = "질문은 2자 이상 2000자 이내로 입력해주세요.")
        String content
) {
}
