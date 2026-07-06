package com.madmon.main.auth.controller;

import com.madmon.main.auth.dto.ChangePasswordRequest;
import com.madmon.main.auth.dto.LoginRequest;
import com.madmon.main.auth.dto.LoginResponse;
import com.madmon.main.auth.dto.RefreshTokenRequest;
import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.auth.service.AuthService;
import com.madmon.main.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success(authService.refresh(request));
    }

    @PatchMapping("/password")
    public ApiResponse<LoginResponse> changePassword(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        return ApiResponse.success(authService.changePassword(authenticatedUser.id(), request));
    }
}
