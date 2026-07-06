package com.madmon.main.auth.jwt;

public record AuthenticatedUser(Long id, String userId, boolean passwordChanged) {
}
