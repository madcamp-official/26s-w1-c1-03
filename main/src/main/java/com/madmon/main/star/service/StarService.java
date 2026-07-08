package com.madmon.main.star.service;

import com.madmon.main.star.dto.StarDetailResponse;
import com.madmon.main.star.dto.StarSummaryResponse;
import com.madmon.main.star.dto.TitleVoteSummary;
import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.evaluation.repository.EvaluationRepository;
import com.madmon.main.team.entity.TeamMember;
import com.madmon.main.team.repository.TeamMemberRepository;
import com.madmon.main.title.entity.UserTitleStats;
import com.madmon.main.title.repository.UserTitleStatsRepository;
import com.madmon.main.user.dto.UserStatsResponse;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 은하(별 목록)는 자체 Entity/Repository가 없는 읽기 전용 조합 계층이다(BACKEND_DEVELOPMENT_PLAN.md §2.2).
// 원래 설계상으로는 user/team/evaluation/title 각 도메인의 Service를 조합해야 하지만,
// 이 시점에는 Team/Evaluation/Title의 Service 계층(Phase 7~8)이 아직 없어 해당 도메인의
// Repository를 직접 사용한다. Phase 7~8의 Service가 만들어지면 그쪽 Service 호출로 교체하는 것을 권장한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StarService {

    private final UserRepository userRepository;
    private final UserStatsRepository userStatsRepository;
    private final UserTitleStatsRepository userTitleStatsRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final EvaluationRepository evaluationRepository;

    // 목록의 잠금 여부는 별마다 다른 게 아니라 "보는 사람이 자기 평가를 끝냈는가"로 결정되므로,
    // 조회당 한 번만 계산해 모든 별에 동일하게 적용한다.
    public List<StarSummaryResponse> getStars(Long viewerId) {
        LockStatus lockStatus = evaluateLockStatus(viewerId);
        return userStatsRepository.findAllWithUser().stream()
                .map(stats -> toSummary(stats, lockStatus))
                .toList();
    }

    public StarDetailResponse getStarDetail(Long viewerId, Long targetUserId) {
        // 잠금 여부를 먼저 확정한 뒤에야 그 결과에 따라 필요한 데이터만 조회한다.
        // 잠긴 경우 능력치/자기소개/칭호 득표 내역은 아예 조회하지 않는다.
        LockStatus lockStatus = evaluateLockStatus(viewerId);
        List<String> representativeTitles = representativeTitleNames(targetUserId);

        if (!lockStatus.unlocked()) {
            User target = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
            return new StarDetailResponse(
                    targetUserId, target.getName(), target.getProfileImageUrl(),
                    representativeTitles, null,
                    false, lockStatus.remainingCount(), null, null
            );
        }

        UserStats targetStats = userStatsRepository.findById(targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        User target = targetStats.getUser();
        List<TitleVoteSummary> titles = userTitleStatsRepository.findAllByUser_IdOrderByVoteCountDesc(targetUserId).stream()
                .map(this::toTitleVoteSummary)
                .toList();

        return new StarDetailResponse(
                targetUserId, target.getName(), target.getProfileImageUrl(),
                representativeTitles, UserStatsResponse.from(targetStats),
                true, 0, target.getBiography(), titles
        );
    }

    // 사용자가 "활성화된 동료 평가"를 모두 제출했는지 판정한다(기능명세서 4.6.1).
    // 대상: 현재 소속(leftAt == null) & 마감기한이 지난(project_deadline 경과) 팀들의 팀원 전원.
    // 그런 팀이 하나도 없으면(평가 대상 자체가 없으면) 정책상 잠금 없이 열람을 허용한다.
    public LockStatus evaluateLockStatus(Long viewerId) {
        List<TeamMember> activeFinishedMemberships = teamMemberRepository.findAllByUserId(viewerId).stream()
                .filter(membership -> membership.getLeftAt() == null && membership.isEvaluationEligible())
                .toList();

        if (activeFinishedMemberships.isEmpty()) {
            return LockStatus.UNLOCKED;
        }

        // 같은 사람과 여러 팀을 함께했어도 평가는 한 번만 하면 되므로(evaluation 도메인과 동일한
        // 정책), 팀마다 따로 세지 않고 평가해야 할 사람을 팀 전체에서 중복 없이 모은다.
        Set<Long> distinctTeammateIds = new LinkedHashSet<>();
        for (TeamMember membership : activeFinishedMemberships) {
            Long teamId = membership.getTeam().getId();
            for (TeamMember teammate : teamMemberRepository.findAllByTeamIdAndLeftAtIsNull(teamId)) {
                Long teammateId = teammate.getUser().getId();
                if (!teammateId.equals(viewerId)) {
                    distinctTeammateIds.add(teammateId);
                }
            }
        }

        long remainingCount = distinctTeammateIds.stream()
                .filter(teammateId -> !evaluationRepository.existsByEvaluatorIdAndTargetId(viewerId, teammateId))
                .count();

        return remainingCount == 0 ? LockStatus.UNLOCKED : new LockStatus(false, (int) remainingCount);
    }

    // 대표 칭호(§3.4): 최다 득표 칭호를 반환하며, 동점이면 그 값과 동일한 칭호를 모두 반환한다.
    private List<String> representativeTitleNames(Long userId) {
        List<UserTitleStats> stats = userTitleStatsRepository.findAllByUser_IdOrderByVoteCountDesc(userId);
        if (stats.isEmpty()) {
            return List.of();
        }

        int maxVoteCount = stats.get(0).getVoteCount();
        if (maxVoteCount <= 0) {
            return List.of();
        }

        return stats.stream()
                .filter(stat -> stat.getVoteCount() == maxVoteCount)
                .map(stat -> stat.getTitle().getName())
                .toList();
    }

    private StarSummaryResponse toSummary(UserStats stats, LockStatus lockStatus) {
        User user = stats.getUser();
        return new StarSummaryResponse(
                user.getId(),
                user.getName(),
                user.getProfileImageUrl(),
                representativeTitleNames(user.getId()),
                lockStatus.unlocked() ? UserStatsResponse.from(stats) : null,
                lockStatus.unlocked(),
                lockStatus.remainingCount()
        );
    }

    private TitleVoteSummary toTitleVoteSummary(UserTitleStats stats) {
        return new TitleVoteSummary(stats.getTitle().getName(), stats.getTitle().getIcon(), stats.getVoteCount());
    }
}
