package com.madmon.main.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
        @NotBlank(message = "리프레시 토큰을 입력해주세요.") String refreshToken
) {
}
