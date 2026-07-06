package com.madmon.main.chat.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateSessionRequest(
        @NotEmpty(message = "카드를 1개 이상 선택해주세요.")
        List<Long> targetUserIds,

        @Size(max = 100, message = "세션 제목은 100자 이내로 입력해주세요.")
        String title
) {
}
