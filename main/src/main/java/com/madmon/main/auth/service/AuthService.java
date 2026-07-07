package com.madmon.main.auth.service;

import com.madmon.main.auth.dto.ChangePasswordRequest;
import com.madmon.main.auth.dto.LoginRequest;
import com.madmon.main.auth.dto.LoginResponse;
import com.madmon.main.auth.dto.RefreshTokenRequest;
import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.auth.jwt.JwtTokenProvider;
import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    // 실패 횟수 증가/계정 잠금은 BusinessException으로 로그인이 실패하는 경우에도 반드시
    // 커밋되어야 하므로, 클래스 기본값(readOnly)을 덮어쓰고 noRollbackFor로 롤백을 막는다.
    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUserId(request.userId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));

        if (user.isAccountLocked()) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            user.recordFailedLogin();
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        user.resetFailedLoginAttempts();
        return issueTokens(user);
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        String refreshToken = request.refreshToken();

        if (!jwtTokenProvider.isValidToken(refreshToken)
                || jwtTokenProvider.getTokenType(refreshToken) != JwtTokenProvider.TokenType.REFRESH) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        AuthenticatedUser parsed = jwtTokenProvider.parseToken(refreshToken);
        User user = userRepository.findById(parsed.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));

        return issueTokens(user);
    }

    @Transactional
    public LoginResponse changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));

        // 기존에 발급된 토큰은 passwordChanged=false 클레임을 그대로 들고 있어 그대로 두면
        // 클라이언트가 재로그인하기 전까지 계속 403(PASSWORD_CHANGE_REQUIRED)을 받으므로,
        // 변경된 상태를 반영한 새 토큰 쌍을 즉시 내려준다.
        return issueTokens(user);
    }

    private LoginResponse issueTokens(User user) {
        String accessToken = jwtTokenProvider.createAccessToken(user);
        String refreshToken = jwtTokenProvider.createRefreshToken(user);
        return new LoginResponse(accessToken, refreshToken, user.isPasswordChanged());
    }
}
