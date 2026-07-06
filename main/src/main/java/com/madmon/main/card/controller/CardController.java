package com.madmon.main.card.controller;

import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.card.dto.CardDetailResponse;
import com.madmon.main.card.dto.CardSummaryResponse;
import com.madmon.main.card.service.CardService;
import com.madmon.main.common.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @GetMapping
    public ApiResponse<List<CardSummaryResponse>> getCards(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ApiResponse.success(cardService.getCards(authenticatedUser.id()));
    }

    @GetMapping("/{userId}")
    public ApiResponse<CardDetailResponse> getCardDetail(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long userId
    ) {
        return ApiResponse.success(cardService.getCardDetail(authenticatedUser.id(), userId));
    }
}
