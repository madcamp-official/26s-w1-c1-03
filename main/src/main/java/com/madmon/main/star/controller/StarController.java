package com.madmon.main.star.controller;

import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.star.dto.StarDetailResponse;
import com.madmon.main.star.dto.StarSummaryResponse;
import com.madmon.main.star.service.StarService;
import com.madmon.main.common.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stars")
@RequiredArgsConstructor
public class StarController {

    private final StarService starService;

    @GetMapping
    public ApiResponse<List<StarSummaryResponse>> getStars(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ApiResponse.success(starService.getStars(authenticatedUser.id()));
    }

    @GetMapping("/{userId}")
    public ApiResponse<StarDetailResponse> getStarDetail(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long userId
    ) {
        return ApiResponse.success(starService.getStarDetail(authenticatedUser.id(), userId));
    }
}
