package com.madmon.main.card.dto;

import com.madmon.main.user.dto.UserStatsResponse;
import java.util.List;

public record CardDetailResponse(
        Long userId,
        String name,
        String profileImageUrl,
        List<String> representativeTitles,
        UserStatsResponse stats,
        boolean isUnlocked,
        int remainingCount,
        String biography,
        List<TitleVoteSummary> titles
) {
}
