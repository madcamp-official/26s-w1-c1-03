package com.madmon.main.team.dto;

import com.madmon.main.team.entity.Team;
import java.time.Instant;

public record TeamResponse(
        Long id,
        String name,
        String inviteCode,
        Long ownerId,
        String ownerName,
        int memberCount,
        Instant projectDeadline
) {

    public static TeamResponse of(Team team, int memberCount) {
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getInviteCode(),
                team.getOwner().getId(),
                team.getOwner().getName(),
                memberCount,
                team.getProjectDeadline()
        );
    }
}
