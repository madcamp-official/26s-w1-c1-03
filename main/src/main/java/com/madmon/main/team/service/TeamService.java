package com.madmon.main.team.service;

import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.team.dto.CreateTeamRequest;
import com.madmon.main.team.dto.JoinTeamRequest;
import com.madmon.main.team.dto.TeamDetailResponse;
import com.madmon.main.team.dto.TeamMemberResponse;
import com.madmon.main.team.dto.TeamResponse;
import com.madmon.main.team.entity.Team;
import com.madmon.main.team.entity.TeamMember;
import com.madmon.main.team.repository.TeamMemberRepository;
import com.madmon.main.team.repository.TeamRepository;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamService {

    private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int INVITE_CODE_LENGTH = 6;

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public TeamResponse createTeam(Long userId, CreateTeamRequest request) {
        User owner = getUser(userId);
        Team team = teamRepository.save(
                Team.create(request.name(), generateUniqueInviteCode(), owner, request.projectDeadline()));
        teamMemberRepository.save(TeamMember.join(team, owner));
        return TeamResponse.of(team, 1);
    }

    @Transactional
    public TeamResponse joinTeam(Long userId, JoinTeamRequest request) {
        User user = getUser(userId);
        Team team = teamRepository.findByInviteCode(request.inviteCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.TEAM_NOT_FOUND));

        if (!Instant.now().isBefore(team.getProjectDeadline())) {
            throw new BusinessException(ErrorCode.TEAM_DEADLINE_PASSED);
        }

        TeamMember existing = teamMemberRepository.findByTeamIdAndUserId(team.getId(), userId).orElse(null);
        if (existing == null) {
            teamMemberRepository.save(TeamMember.join(team, user));
        } else if (existing.getLeftAt() == null) {
            throw new BusinessException(ErrorCode.ALREADY_TEAM_MEMBER);
        } else {
            existing.rejoin();
        }

        return TeamResponse.of(team, teamMemberRepository.countByTeamIdAndLeftAtIsNull(team.getId()));
    }

    public List<TeamResponse> getMyTeams(Long userId) {
        return teamMemberRepository.findAllByUserIdAndLeftAtIsNull(userId).stream()
                .map(member -> TeamResponse.of(
                        member.getTeam(),
                        teamMemberRepository.countByTeamIdAndLeftAtIsNull(member.getTeam().getId())
                ))
                .toList();
    }

    public TeamDetailResponse getTeamDetail(Long userId, Long teamId) {
        Team team = getTeam(teamId);
        validateActiveMembership(teamId, userId);

        return toDetail(team);
    }

    // 은하 화면의 팀 별자리 클러스터/선은 소속 여부와 무관하게 "진행 중인(마감 전) 모든 팀"을
    // 똑같이 보여줘야 하므로, getMyTeams/getTeamDetail과 달리 멤버십 검증 없이 전체를 내려준다.
    public List<TeamDetailResponse> getActiveTeams() {
        Instant now = Instant.now();
        return teamRepository.findAll().stream()
                .filter(team -> now.isBefore(team.getProjectDeadline()))
                .map(this::toDetail)
                .toList();
    }

    private TeamDetailResponse toDetail(Team team) {
        List<TeamMember> members = teamMemberRepository.findAllByTeamIdAndLeftAtIsNull(team.getId());
        List<TeamMemberResponse> memberResponses = members.stream()
                .map(member -> TeamMemberResponse.of(member, member.getUser().getId().equals(team.getOwner().getId())))
                .toList();
        return new TeamDetailResponse(TeamResponse.of(team, members.size()), memberResponses);
    }

    @Transactional
    public void leaveTeam(Long userId, Long teamId) {
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .filter(m -> m.getLeftAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_TEAM_MEMBER));
        member.leave();
    }

    private void validateActiveMembership(Long teamId, Long userId) {
        boolean isActiveMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .map(member -> member.getLeftAt() == null)
                .orElse(false);
        if (!isActiveMember) {
            throw new BusinessException(ErrorCode.NOT_TEAM_MEMBER);
        }
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private Team getTeam(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TEAM_NOT_FOUND));
    }

    private String generateUniqueInviteCode() {
        String code;
        do {
            code = generateRandomCode();
        } while (teamRepository.existsByInviteCode(code));
        return code;
    }

    private String generateRandomCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            sb.append(INVITE_CODE_CHARS.charAt(random.nextInt(INVITE_CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
