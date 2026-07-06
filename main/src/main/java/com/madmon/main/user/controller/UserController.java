package com.madmon.main.user.controller;

import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.common.response.ApiResponse;
import com.madmon.main.user.dto.InitialStatsRequest;
import com.madmon.main.user.dto.UpdateProfileRequest;
import com.madmon.main.user.dto.UserProfileResponse;
import com.madmon.main.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ApiResponse<UserProfileResponse> getMyProfile(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ApiResponse.success(userService.getMyProfile(authenticatedUser.id()));
    }

    @PatchMapping
    public ApiResponse<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ApiResponse.success(userService.updateProfile(authenticatedUser.id(), request));
    }

    @PatchMapping("/initial-stats")
    public ApiResponse<UserProfileResponse> setInitialStats(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody InitialStatsRequest request
    ) {
        return ApiResponse.success(userService.setInitialStats(authenticatedUser.id(), request));
    }

    @PostMapping("/profile-image")
    public ApiResponse<UserProfileResponse> uploadProfileImage(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @RequestParam("file") MultipartFile file
    ) {
        return ApiResponse.success(userService.uploadProfileImage(authenticatedUser.id(), file));
    }
}
