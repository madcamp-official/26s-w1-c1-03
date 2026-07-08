package com.madmon.main.evaluation.entity;

import com.madmon.main.common.entity.BaseCreatedAtEntity;
import com.madmon.main.team.entity.Team;
import com.madmon.main.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Entity
@Table(
        name = "evaluations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_evaluations_team_evaluator_target",
                        columnNames = {"team_id", "evaluator_id", "target_id"}
                )
        },
        indexes = {
                @Index(name = "idx_evaluations_evaluator_id", columnList = "evaluator_id"),
                @Index(name = "idx_evaluations_target_id", columnList = "target_id")
        }
)
@Check(constraints = "attack BETWEEN 1 AND 10 AND defense BETWEEN 1 AND 10 AND agility BETWEEN 1 AND 10 "
        + "AND teamwork BETWEEN 1 AND 10 AND mana BETWEEN 1 AND 10 AND health BETWEEN 1 AND 10 "
        + "AND total_score BETWEEN 6 AND 60 AND evaluator_id <> target_id")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Evaluation extends BaseCreatedAtEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 팀이 삭제되면(팀원 전원 나가기) DB가 ON DELETE SET NULL로 이 값을 null로 만든다 —
    // 평가 점수/이력 자체는 팀이 사라진 뒤에도 그대로 남겨두기 위함.
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "team_id", nullable = true)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluator_id", nullable = false)
    private User evaluator;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_id", nullable = false)
    private User target;

    @Column(nullable = false)
    private int attack;

    @Column(nullable = false)
    private int defense;

    @Column(nullable = false)
    private int agility;

    @Column(nullable = false)
    private int teamwork;

    @Column(nullable = false)
    private int mana;

    @Column(name = "health", nullable = false)
    private int health;

    @Column(name = "total_score", nullable = false)
    private int totalScore;

    private Evaluation(
            Team team,
            User evaluator,
            User target,
            int attack,
            int defense,
            int agility,
            int teamwork,
            int mana,
            int health
    ) {
        this.team = team;
        this.evaluator = evaluator;
        this.target = target;
        this.attack = attack;
        this.defense = defense;
        this.agility = agility;
        this.teamwork = teamwork;
        this.mana = mana;
        this.health = health;
        this.totalScore = attack + defense + agility + teamwork + mana + health;
    }

    public static Evaluation create(
            Team team,
            User evaluator,
            User target,
            int attack,
            int defense,
            int agility,
            int teamwork,
            int mana,
            int health
    ) {
        return new Evaluation(team, evaluator, target, attack, defense, agility, teamwork, mana, health);
    }
}
