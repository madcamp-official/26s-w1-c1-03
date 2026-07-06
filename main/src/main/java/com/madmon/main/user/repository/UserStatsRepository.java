package com.madmon.main.user.repository;

import com.madmon.main.user.entity.UserStats;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserStatsRepository extends JpaRepository<UserStats, Long> {

    @Query("select us from UserStats us join fetch us.user")
    List<UserStats> findAllWithUser();
}
