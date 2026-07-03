package com.madmon.main.title.repository;

import com.madmon.main.title.entity.TitleVote;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TitleVoteRepository extends JpaRepository<TitleVote, Long> {

    boolean existsByEvaluationIdAndTitleId(Long evaluationId, Long titleId);
}
