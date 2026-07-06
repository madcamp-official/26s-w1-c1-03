package com.madmon.main.user.dto;

import com.madmon.main.user.entity.UserStats;
import java.math.BigDecimal;

public record UserStatsResponse(
        BigDecimal attack,
        BigDecimal defense,
        BigDecimal agility,
        BigDecimal teamwork,
        BigDecimal mana,
        BigDecimal health,
        int evaluationCount
) {

    public static UserStatsResponse from(UserStats stats) {
        return new UserStatsResponse(
                stats.getAttackScore(),
                stats.getDefenseScore(),
                stats.getAgilityScore(),
                stats.getTeamworkScore(),
                stats.getManaScore(),
                stats.getHealthScore(),
                stats.getEvaluationCount()
        );
    }
}
