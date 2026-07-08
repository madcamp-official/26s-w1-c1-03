package com.madmon.main.team.controller;

import com.madmon.main.auth.jwt.AuthenticatedUser;
import com.madmon.main.common.response.ApiResponse;
import com.madmon.main.team.dto.CreateTeamRequest;
import com.madmon.main.team.dto.JoinTeamRequest;
import com.madmon.main.team.dto.TeamDetailResponse;
import com.madmon.main.team.dto.TeamResponse;
import com.madmon.main.team.service.TeamService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    public ApiResponse<TeamResponse> createTeam(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody CreateTeamRequest request
    ) {
        return ApiResponse.success(teamService.createTeam(authenticatedUser.id(), request));
    }

    @PostMapping("/join")
    public ApiResponse<TeamResponse> joinTeam(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody JoinTeamRequest request
    ) {
        return ApiResponse.success(teamService.joinTeam(authenticatedUser.id(), request));
    }

    @GetMapping
    public ApiResponse<List<TeamResponse>> getMyTeams(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ApiResponse.success(teamService.getMyTeams(authenticatedUser.id()));
    }

    // 은하 화면 전용: 내 소속 여부와 무관하게 마감이 지나지 않은(=진행 중인) 모든 팀을 보여준다.
    @GetMapping("/active")
    public ApiResponse<List<TeamDetailResponse>> getActiveTeams() {
        return ApiResponse.success(teamService.getActiveTeams());
    }

    @GetMapping("/{teamId}")
    public ApiResponse<TeamDetailResponse> getTeamDetail(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long teamId
    ) {
        return ApiResponse.success(teamService.getTeamDetail(authenticatedUser.id(), teamId));
    }

    @DeleteMapping("/{teamId}/members/me")
    public ApiResponse<Void> leaveTeam(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable Long teamId
    ) {
        teamService.leaveTeam(authenticatedUser.id(), teamId);
        return ApiResponse.empty();
    }
}
