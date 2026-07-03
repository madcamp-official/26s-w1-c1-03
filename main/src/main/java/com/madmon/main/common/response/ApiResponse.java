package com.madmon.main.common.response;

import java.time.LocalDateTime;

public record ApiResponse<T>(
        boolean success,
        T data,
        LocalDateTime timestamp
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, LocalDateTime.now());
    }

    public static ApiResponse<Void> empty() {
        return new ApiResponse<>(true, null, LocalDateTime.now());
    }
}
