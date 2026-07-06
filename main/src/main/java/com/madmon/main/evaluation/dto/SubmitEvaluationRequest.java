package com.madmon.main.evaluation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SubmitEvaluationRequest(
        @NotNull(message = "팀을 선택해주세요.") Long teamId,
        @NotNull(message = "평가 대상을 선택해주세요.") Long targetUserId,

        @Min(value = 1, message = "공격력은 1 이상이어야 합니다.") @Max(value = 10, message = "공격력은 10 이하여야 합니다.")
        int attack,
        @Min(value = 1, message = "방어력은 1 이상이어야 합니다.") @Max(value = 10, message = "방어력은 10 이하여야 합니다.")
        int defense,
        @Min(value = 1, message = "speed는 1 이상이어야 합니다.") @Max(value = 10, message = "speed는 10 이하여야 합니다.")
        int speed,
        @Min(value = 1, message = "협업 능력은 1 이상이어야 합니다.") @Max(value = 10, message = "협업 능력은 10 이하여야 합니다.")
        int teamwork,
        @Min(value = 1, message = "창의성은 1 이상이어야 합니다.") @Max(value = 10, message = "창의성은 10 이하여야 합니다.")
        int creativity,
        @Min(value = 1, message = "문제 해결 능력은 1 이상이어야 합니다.") @Max(value = 10, message = "문제 해결 능력은 10 이하여야 합니다.")
        int problemSolving,

        List<Long> titleIds
) {
}
