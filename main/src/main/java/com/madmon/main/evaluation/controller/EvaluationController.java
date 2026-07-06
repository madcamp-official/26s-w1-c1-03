package com.madmon.main.evaluation.controller;

import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.common.response.ApiResponse;
import com.madmon.main.evaluation.dto.EvaluationResponse;
import com.madmon.main.evaluation.dto.EvaluationTargetResponse;
import com.madmon.main.evaluation.dto.SubmitEvaluationRequest;
import com.madmon.main.evaluation.service.EvaluationService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/evaluations")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    @GetMapping("/targets")
    public ApiResponse<List<EvaluationTargetResponse>> getEvaluationTargets(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        return ApiResponse.success(evaluationService.getEvaluationTargets(authenticatedUser.id()));
    }

    @PostMapping
    public ApiResponse<EvaluationResponse> submitEvaluation(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody SubmitEvaluationRequest request
    ) {
        return ApiResponse.success(evaluationService.submitEvaluation(authenticatedUser.id(), request));
    }
}
