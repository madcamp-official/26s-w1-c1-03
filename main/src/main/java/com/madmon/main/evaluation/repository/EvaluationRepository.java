package com.madmon.main.evaluation.repository;

import com.madmon.main.evaluation.entity.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    boolean existsByTeamIdAndEvaluatorIdAndTargetId(Long teamId, Long evaluatorId, Long targetId);
}
