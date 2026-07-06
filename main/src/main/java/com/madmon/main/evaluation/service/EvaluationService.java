package com.madmon.main.evaluation.service;

import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.evaluation.dto.EvaluationResponse;
import com.madmon.main.evaluation.dto.EvaluationTargetResponse;
import com.madmon.main.evaluation.dto.SubmitEvaluationRequest;
import com.madmon.main.evaluation.entity.Evaluation;
import com.madmon.main.evaluation.repository.EvaluationRepository;
import com.madmon.main.team.entity.Team;
import com.madmon.main.team.entity.TeamMember;
import com.madmon.main.team.repository.TeamMemberRepository;
import com.madmon.main.title.service.TitleService;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EvaluationService {

    // 신규 평가에 30%, 기존 누적 점수에 70% 가중치를 두는 지수 이동 평균(EMA).
    // 단순 평균이 아니라 이 비율로 섞이기 때문에 최종 표시 점수만 보고 방금 받은 평가의
    // 원점수를 역산할 수 없다(기능명세서 4.4).
    private static final BigDecimal EMA_ALPHA = new BigDecimal("0.3");

    private final EvaluationRepository evaluationRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final UserStatsRepository userStatsRepository;
    private final TitleService titleService;

    public List<EvaluationTargetResponse> getEvaluationTargets(Long evaluatorId) {
        List<TeamMember> finishedActiveMemberships = teamMemberRepository.findAllByUserId(evaluatorId).stream()
                .filter(membership -> membership.getLeftAt() == null && membership.isEvaluationEligible())
                .toList();

        List<EvaluationTargetResponse> targets = new ArrayList<>();
        for (TeamMember membership : finishedActiveMemberships) {
            Team team = membership.getTeam();
            for (TeamMember teammate : teamMemberRepository.findAllByTeamIdAndLeftAtIsNull(team.getId())) {
                User teammateUser = teammate.getUser();
                if (teammateUser.getId().equals(evaluatorId)) {
                    continue;
                }
                boolean alreadyEvaluated = evaluationRepository
                        .existsByTeamIdAndEvaluatorIdAndTargetId(team.getId(), evaluatorId, teammateUser.getId());
                targets.add(new EvaluationTargetResponse(
                        team.getId(), team.getName(),
                        teammateUser.getId(), teammateUser.getName(), teammateUser.getProfileImageUrl(),
                        alreadyEvaluated
                ));
            }
        }
        return targets;
    }

    @Transactional
    public EvaluationResponse submitEvaluation(Long evaluatorId, SubmitEvaluationRequest request) {
        if (evaluatorId.equals(request.targetUserId())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "자기 자신을 평가할 수 없습니다.");
        }

        TeamMember evaluatorMembership = teamMemberRepository.findByTeamIdAndUserId(request.teamId(), evaluatorId)
                .filter(membership -> membership.getLeftAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_TEAM_MEMBER));

        if (!evaluatorMembership.isEvaluationEligible()) {
            throw new BusinessException(ErrorCode.PROJECT_NOT_FINISHED);
        }

        boolean targetIsActiveMember = teamMemberRepository
                .findByTeamIdAndUserId(request.teamId(), request.targetUserId())
                .map(membership -> membership.getLeftAt() == null)
                .orElse(false);
        if (!targetIsActiveMember) {
            throw new BusinessException(ErrorCode.NOT_TEAM_MEMBER, "평가 대상이 같은 팀의 멤버가 아닙니다.");
        }

        if (evaluationRepository.existsByTeamIdAndEvaluatorIdAndTargetId(
                request.teamId(), evaluatorId, request.targetUserId())) {
            throw new BusinessException(ErrorCode.EVALUATION_ALREADY_SUBMITTED);
        }

        validateNoDuplicateTitles(request.titleIds());

        Team team = evaluatorMembership.getTeam();
        User evaluator = evaluatorMembership.getUser();
        User target = userRepository.findById(request.targetUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        Evaluation evaluation = evaluationRepository.save(Evaluation.create(
                team, evaluator, target,
                request.attack(), request.defense(), request.agility(),
                request.teamwork(), request.mana(), request.health()
        ));

        if (request.titleIds() != null && !request.titleIds().isEmpty()) {
            titleService.registerVotes(evaluation, target, request.titleIds());
        }

        applyEmaUpdate(target, evaluation);

        return EvaluationResponse.of(evaluation);
    }

    private void applyEmaUpdate(User target, Evaluation evaluation) {
        UserStats stats = userStatsRepository.findById(target.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ONBOARDING_NOT_COMPLETED));

        stats.replaceScores(
                ema(stats.getAttackScore(), evaluation.getAttack()),
                ema(stats.getDefenseScore(), evaluation.getDefense()),
                ema(stats.getAgilityScore(), evaluation.getAgility()),
                ema(stats.getTeamworkScore(), evaluation.getTeamwork()),
                ema(stats.getManaScore(), evaluation.getMana()),
                ema(stats.getHealthScore(), evaluation.getHealth())
        );
        stats.incrementEvaluationCount();
    }

    private BigDecimal ema(BigDecimal previousScore, int newRawScore) {
        BigDecimal newTerm = EMA_ALPHA.multiply(BigDecimal.valueOf(newRawScore));
        BigDecimal previousTerm = BigDecimal.ONE.subtract(EMA_ALPHA).multiply(previousScore);
        return newTerm.add(previousTerm).setScale(2, RoundingMode.HALF_UP);
    }

    private void validateNoDuplicateTitles(List<Long> titleIds) {
        if (titleIds == null) {
            return;
        }
        if (new HashSet<>(titleIds).size() != titleIds.size()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "칭호는 중복 선택할 수 없습니다.");
        }
    }
}
