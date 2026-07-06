package com.madmon.main.team.dto;

import jakarta.validation.constraints.NotBlank;

public record JoinTeamRequest(
        @NotBlank(message = "초대 코드를 입력해주세요.") String inviteCode
) {
}
