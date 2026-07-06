package com.madmon.main.user.dto;

import com.madmon.main.user.entity.UserStats;
import java.math.BigDecimal;

public record UserStatsResponse(
        BigDecimal attack,
        BigDecimal defense,
        BigDecimal speed,
        BigDecimal teamwork,
        BigDecimal creativity,
        BigDecimal problemSolving,
        int evaluationCount
) {

    public static UserStatsResponse from(UserStats stats) {
        return new UserStatsResponse(
                stats.getAttackScore(),
                stats.getDefenseScore(),
                stats.getSpeedScore(),
                stats.getTeamworkScore(),
                stats.getCreativityScore(),
                stats.getProblemSolvingScore(),
                stats.getEvaluationCount()
        );
    }
}
