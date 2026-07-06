package com.madmon.main.auth.jwt;

import com.madmon.main.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    public enum TokenType {
        ACCESS, REFRESH
    }

    private static final String CLAIM_USER_ID = "userId";
    private static final String CLAIM_PASSWORD_CHANGED = "passwordChanged";
    private static final String CLAIM_TOKEN_TYPE = "tokenType";

    private final SecretKey key;
    private final long accessTokenExpirationMillis;
    private final long refreshTokenExpirationMillis;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiration}") long accessTokenExpirationMillis,
            @Value("${app.jwt.refresh-token-expiration}") long refreshTokenExpirationMillis
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMillis = accessTokenExpirationMillis;
        this.refreshTokenExpirationMillis = refreshTokenExpirationMillis;
    }

    public String createAccessToken(User user) {
        return createToken(user, accessTokenExpirationMillis, TokenType.ACCESS);
    }

    public String createRefreshToken(User user) {
        return createToken(user, refreshTokenExpirationMillis, TokenType.REFRESH);
    }

    private String createToken(User user, long expirationMillis, TokenType tokenType) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim(CLAIM_USER_ID, user.getUserId())
                .claim(CLAIM_PASSWORD_CHANGED, user.isPasswordChanged())
                .claim(CLAIM_TOKEN_TYPE, tokenType.name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public AuthenticatedUser parseToken(String token) {
        Claims claims = parseClaims(token);

        return new AuthenticatedUser(
                Long.valueOf(claims.getSubject()),
                claims.get(CLAIM_USER_ID, String.class),
                claims.get(CLAIM_PASSWORD_CHANGED, Boolean.class)
        );
    }

    public TokenType getTokenType(String token) {
        return TokenType.valueOf(parseClaims(token).get(CLAIM_TOKEN_TYPE, String.class));
    }

    public boolean isValidToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
