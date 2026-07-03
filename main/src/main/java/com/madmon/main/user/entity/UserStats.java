package com.madmon.main.user.entity;

import com.madmon.main.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "user_stats")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserStats extends BaseEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "attack_score", nullable = false)
    private double attackScore;

    @Column(name = "defense_score", nullable = false)
    private double defenseScore;

    @Column(name = "speed_score", nullable = false)
    private double speedScore;

    @Column(name = "teamwork_score", nullable = false)
    private double teamworkScore;

    @Column(name = "creativity_score", nullable = false)
    private double creativityScore;

    @Column(name = "problem_solving_score", nullable = false)
    private double problemSolvingScore;

    @Column(name = "evaluation_count", nullable = false)
    private int evaluationCount;

    private UserStats(User user) {
        this.user = user;
        this.attackScore = user.getInitialAttack();
        this.defenseScore = user.getInitialDefense();
        this.speedScore = user.getInitialSpeed();
        this.teamworkScore = user.getInitialTeamwork();
        this.creativityScore = user.getInitialCreativity();
        this.problemSolvingScore = user.getInitialProblemSolving();
        this.evaluationCount = 0;
    }

    public static UserStats createFrom(User user) {
        return new UserStats(user);
    }

    public void replaceScores(
            double attackScore,
            double defenseScore,
            double speedScore,
            double teamworkScore,
            double creativityScore,
            double problemSolvingScore
    ) {
        this.attackScore = attackScore;
        this.defenseScore = defenseScore;
        this.speedScore = speedScore;
        this.teamworkScore = teamworkScore;
        this.creativityScore = creativityScore;
        this.problemSolvingScore = problemSolvingScore;
    }

    public void incrementEvaluationCount() {
        this.evaluationCount++;
    }
}
