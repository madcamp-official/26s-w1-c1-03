package com.madmon.main.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        String profileImageUrl,

        @Size(max = 50, message = "자기소개는 50자 이내로 입력해주세요.")
        String biography
) {
}
