package com.madmon.main.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record InitialStatsRequest(
        @NotNull(message = "공격력을 입력해주세요.") @Min(1) @Max(10) Integer attack,
        @NotNull(message = "방어력을 입력해주세요.") @Min(1) @Max(10) Integer defense,
        @NotNull(message = "speed를 입력해주세요.") @Min(1) @Max(10) Integer speed,
        @NotNull(message = "협업 능력을 입력해주세요.") @Min(1) @Max(10) Integer teamwork,
        @NotNull(message = "창의성을 입력해주세요.") @Min(1) @Max(10) Integer creativity,
        @NotNull(message = "문제 해결 능력을 입력해주세요.") @Min(1) @Max(10) Integer problemSolving
) {
}
