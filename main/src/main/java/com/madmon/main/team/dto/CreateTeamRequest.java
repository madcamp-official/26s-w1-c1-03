package com.madmon.main.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTeamRequest(
        @NotBlank(message = "팀 이름을 입력해주세요.")
        @Size(max = 100, message = "팀 이름은 100자 이내로 입력해주세요.")
        String name
) {
}
