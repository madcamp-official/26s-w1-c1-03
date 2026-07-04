package com.madmon.main.auth.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        boolean passwordChanged
) {
}
