package com.madmon.main.user.dto;

import jakarta.validation.constraints.AssertTrue;
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
    // 개별 항목이 null이면 각자의 @NotNull 검증에서 이미 걸러지므로 여기서는 통과시킨다.
    @AssertTrue(message = "능력치 합은 6 이상 40 이하여야 합니다.")
    public boolean isTotalWithinRange() {
        if (attack == null || defense == null || agility == null
                || teamwork == null || mana == null || health == null) {
            return true;
        }
        int total = attack + defense + agility + teamwork + mana + health;
        return total >= 6 && total <= 40;
    }
}
