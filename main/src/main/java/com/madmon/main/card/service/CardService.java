package com.madmon.main.card.service;

import com.madmon.main.card.dto.CardDetailResponse;
import com.madmon.main.card.dto.CardSummaryResponse;
import com.madmon.main.card.dto.TitleVoteSummary;
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
import com.madmon.main.user.repository.UserStatsRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 카드 도감은 자체 Entity/Repository가 없는 읽기 전용 조합 계층이다(BACKEND_DEVELOPMENT_PLAN.md §2.2).
// 원래 설계상으로는 user/team/evaluation/title 각 도메인의 Service를 조합해야 하지만,
// 이 시점에는 Team/Evaluation/Title의 Service 계층(Phase 7~8)이 아직 없어 해당 도메인의
// Repository를 직접 사용한다. Phase 7~8의 Service가 만들어지면 그쪽 Service 호출로 교체하는 것을 권장한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardService {

    private final UserStatsRepository userStatsRepository;
    private final UserTitleStatsRepository userTitleStatsRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final EvaluationRepository evaluationRepository;

    // 목록의 잠금 여부는 카드별이 아니라 "보는 사람이 자기 평가를 끝냈는가"로 결정되므로,
    // 조회당 한 번만 계산해 모든 카드에 동일하게 적용한다.
    public List<CardSummaryResponse> getCards(Long viewerId) {
        LockStatus lockStatus = evaluateLockStatus(viewerId);
        return userStatsRepository.findAllWithUser().stream()
                .map(stats -> toSummary(stats, lockStatus))
                .toList();
    }

    public CardDetailResponse getCardDetail(Long viewerId, Long targetUserId) {
        UserStats targetStats = userStatsRepository.findById(targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        User target = targetStats.getUser();
        List<String> representativeTitles = representativeTitleNames(targetUserId);
        LockStatus lockStatus = evaluateLockStatus(viewerId);

        if (!lockStatus.unlocked()) {
            return new CardDetailResponse(
                    targetUserId, target.getName(), target.getProfileImageUrl(),
                    representativeTitles, null,
                    false, lockStatus.remainingCount(), null, null
            );
        }

        List<TitleVoteSummary> titles = userTitleStatsRepository.findAllByUser_IdOrderByVoteCountDesc(targetUserId).stream()
                .map(this::toTitleVoteSummary)
                .toList();

        return new CardDetailResponse(
                targetUserId, target.getName(), target.getProfileImageUrl(),
                representativeTitles, UserStatsResponse.from(targetStats),
                true, 0, target.getBiography(), titles
        );
    }

    // 사용자가 "활성화된 동료 평가"를 모두 제출했는지 판정한다(기능명세서 4.6.1).
    // 대상: 현재 소속(leftAt == null) & 마감기한이 지난(project_deadline 경과) 팀들의 팀원 전원.
    // 카드 열람은 팀에 들어가 마감기한이 지난 뒤 팀원 전원을 평가해야만 풀리는 잠금이므로,
    // 그런 팀이 하나도 없으면(팀 미소속이거나 아직 마감 전이면) 기본값은 잠금이다.
    public LockStatus evaluateLockStatus(Long viewerId) {
        List<TeamMember> activeFinishedMemberships = teamMemberRepository.findAllByUserId(viewerId).stream()
                .filter(membership -> membership.getLeftAt() == null && membership.isEvaluationEligible())
                .toList();

        if (activeFinishedMemberships.isEmpty()) {
            return new LockStatus(false, 0);
        }

        int remainingCount = 0;
        for (TeamMember membership : activeFinishedMemberships) {
            Long teamId = membership.getTeam().getId();
            for (TeamMember teammate : teamMemberRepository.findAllByTeamIdAndLeftAtIsNull(teamId)) {
                Long teammateId = teammate.getUser().getId();
                if (teammateId.equals(viewerId)) {
                    continue;
                }
                if (!evaluationRepository.existsByTeamIdAndEvaluatorIdAndTargetId(teamId, viewerId, teammateId)) {
                    remainingCount++;
                }
            }
        }

        return remainingCount == 0 ? LockStatus.UNLOCKED : new LockStatus(false, remainingCount);
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

    private CardSummaryResponse toSummary(UserStats stats, LockStatus lockStatus) {
        User user = stats.getUser();
        return new CardSummaryResponse(
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
