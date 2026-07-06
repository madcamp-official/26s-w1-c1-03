package com.madmon.main.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record InitialStatsRequest(
        @NotNull(message = "공격력을 입력해주세요.") @Min(1) @Max(10) Integer attack,
        @NotNull(message = "방어력을 입력해주세요.") @Min(1) @Max(10) Integer defense,
        @NotNull(message = "민첩성을 입력해주세요.") @Min(1) @Max(10) Integer agility,
        @NotNull(message = "협동력을 입력해주세요.") @Min(1) @Max(10) Integer teamwork,
        @NotNull(message = "마력을 입력해주세요.") @Min(1) @Max(10) Integer mana,
        @NotNull(message = "체력을 입력해주세요.") @Min(1) @Max(10) Integer health
) {
}
