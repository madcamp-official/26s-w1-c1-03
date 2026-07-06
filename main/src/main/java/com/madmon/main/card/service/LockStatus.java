package com.madmon.main.card.service;

// Phase 10(AI Chat)에서도 "카드가 잠겨 있는가"를 그대로 재사용할 수 있도록
// CardService.evaluateLockStatus()의 반환 타입을 공개해둔다.
public record LockStatus(boolean unlocked, int remainingCount) {

    public static final LockStatus UNLOCKED = new LockStatus(true, 0);
}
