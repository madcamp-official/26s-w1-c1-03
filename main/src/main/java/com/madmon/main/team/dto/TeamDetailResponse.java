package com.madmon.main.team.dto;

import java.util.List;

public record TeamDetailResponse(
        TeamResponse team,
        List<TeamMemberResponse> members
) {
}
