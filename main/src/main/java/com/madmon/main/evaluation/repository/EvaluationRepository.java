package com.madmon.main.evaluation.repository;

import com.madmon.main.evaluation.entity.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    boolean existsByTeamIdAndEvaluatorIdAndTargetId(Long teamId, Long evaluatorId, Long targetId);

    // 같은 평가자-대상자 쌍은 여러 팀에서 함께했더라도 한 번만 평가한다(공정성/중복 반영 방지).
    boolean existsByEvaluatorIdAndTargetId(Long evaluatorId, Long targetId);
}
