package com.madmon.main.evaluation.dto;

public record EvaluationTargetResponse(
        Long teamId,
        String teamName,
        Long userId,
        String name,
        String profileImageUrl,
        boolean alreadyEvaluated
) {
}
