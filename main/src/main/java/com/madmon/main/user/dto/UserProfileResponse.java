package com.madmon.main.user.dto;

import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;

public record UserProfileResponse(
        Long id,
        String userId,
        String name,
        String profileImageUrl,
        String biography,
        boolean passwordChanged,
        boolean onboarded,
        UserStatsResponse stats
) {

    public static UserProfileResponse of(User user, UserStats stats) {
        return new UserProfileResponse(
                user.getId(),
                user.getUserId(),
                user.getName(),
                user.getProfileImageUrl(),
                user.getBiography(),
                user.isPasswordChanged(),
                stats != null,
                stats == null ? null : UserStatsResponse.from(stats)
        );
    }
}
