package com.madmon.main.title.repository;

import com.madmon.main.title.entity.UserTitleStats;
import com.madmon.main.title.entity.UserTitleStatsId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserTitleStatsRepository extends JpaRepository<UserTitleStats, UserTitleStatsId> {

    List<UserTitleStats> findAllByUser_IdOrderByVoteCountDesc(Long userId);
}
