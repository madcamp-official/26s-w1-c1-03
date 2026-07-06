package com.madmon.main.chat.controller;

import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.chat.dto.ChatSessionDetailResponse;
import com.madmon.main.chat.dto.ChatSessionResponse;
import com.madmon.main.chat.dto.CreateSessionRequest;
import com.madmon.main.chat.dto.SendMessageRequest;
import com.madmon.main.chat.dto.SendMessageResponse;
import com.madmon.main.chat.service.ChatService;
import com.madmon.main.common.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat/sessions")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ApiResponse<ChatSessionResponse> createSession(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody CreateSessionRequest request
    ) {
        return ApiResponse.success(chatService.createSession(authenticatedUser.id(), request));
    }

    @GetMapping
    public ApiResponse<List<ChatSessionResponse>> getSessions(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ApiResponse.success(chatService.getSessions(authenticatedUser.id()));
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<ChatSessionDetailResponse> getSessionDetail(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long sessionId
    ) {
        return ApiResponse.success(chatService.getSessionDetail(authenticatedUser.id(), sessionId));
    }

    @PostMapping("/{sessionId}/messages")
    public ApiResponse<SendMessageResponse> sendMessage(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long sessionId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ApiResponse.success(chatService.sendMessage(authenticatedUser.id(), sessionId, request));
    }
}
