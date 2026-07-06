package com.madmon.main.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Check;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@Entity
@Table(name = "user_stats")
@Check(constraints = "attack_score BETWEEN 1 AND 10 AND defense_score BETWEEN 1 AND 10 "
        + "AND agility_score BETWEEN 1 AND 10 AND teamwork_score BETWEEN 1 AND 10 "
        + "AND mana_score BETWEEN 1 AND 10 AND health_score BETWEEN 1 AND 10 "
        + "AND evaluation_count >= 0")
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserStats {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "attack_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal attackScore;

    @Column(name = "defense_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal defenseScore;

    @Column(name = "agility_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal agilityScore;

    @Column(name = "teamwork_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal teamworkScore;

    @Column(name = "mana_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal manaScore;

    @Column(name = "health_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal healthScore;

    @Column(name = "evaluation_count", nullable = false)
    private int evaluationCount;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    private UserStats(User user) {
        this.user = user;
        this.attackScore = BigDecimal.valueOf(user.getInitialAttack());
        this.defenseScore = BigDecimal.valueOf(user.getInitialDefense());
        this.agilityScore = BigDecimal.valueOf(user.getInitialAgility());
        this.teamworkScore = BigDecimal.valueOf(user.getInitialTeamwork());
        this.manaScore = BigDecimal.valueOf(user.getInitialMana());
        this.healthScore = BigDecimal.valueOf(user.getInitialHealth());
        this.evaluationCount = 0;
    }

    public static UserStats createFrom(User user) {
        return new UserStats(user);
    }

    public void replaceScores(
            BigDecimal attackScore,
            BigDecimal defenseScore,
            BigDecimal agilityScore,
            BigDecimal teamworkScore,
            BigDecimal manaScore,
            BigDecimal healthScore
    ) {
        this.attackScore = attackScore;
        this.defenseScore = defenseScore;
        this.agilityScore = agilityScore;
        this.teamworkScore = teamworkScore;
        this.manaScore = manaScore;
        this.healthScore = healthScore;
    }

    public void incrementEvaluationCount() {
        this.evaluationCount++;
    }
}
