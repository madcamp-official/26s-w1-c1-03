package com.madmon.main.evaluation.dto;

import com.madmon.main.evaluation.entity.Evaluation;

public record EvaluationResponse(
        Long id,
        Long teamId,
        Long targetUserId,
        int totalScore
) {

    public static EvaluationResponse of(Evaluation evaluation) {
        return new EvaluationResponse(
                evaluation.getId(),
                evaluation.getTeam().getId(),
                evaluation.getTarget().getId(),
                evaluation.getTotalScore()
        );
    }
}
