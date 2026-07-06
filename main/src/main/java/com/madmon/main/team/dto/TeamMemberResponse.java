package com.madmon.main.team.dto;

import com.madmon.main.team.entity.TeamMember;

public record TeamMemberResponse(
        Long userId,
        String loginId,
        String name,
        String profileImageUrl,
        boolean isOwner
) {

    public static TeamMemberResponse of(TeamMember member, boolean isOwner) {
        return new TeamMemberResponse(
                member.getUser().getId(),
                member.getUser().getUserId(),
                member.getUser().getName(),
                member.getUser().getProfileImageUrl(),
                isOwner
        );
    }
}
