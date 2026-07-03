package com.madmon.main.common.response;

import com.madmon.main.common.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.List;

public record ErrorResponse(
        boolean success,
        String errorCode,
        String message,
        List<FieldError> errors,
        LocalDateTime timestamp
) {

    public record FieldError(String field, String reason) {
    }

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(false, errorCode.name(), errorCode.getMessage(), List.of(), LocalDateTime.now());
    }

    public static ErrorResponse of(ErrorCode errorCode, String message) {
        return new ErrorResponse(false, errorCode.name(), message, List.of(), LocalDateTime.now());
    }

    public static ErrorResponse of(ErrorCode errorCode, List<FieldError> errors) {
        return new ErrorResponse(false, errorCode.name(), errorCode.getMessage(), errors, LocalDateTime.now());
    }
}
