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
@Check(constraints = "attack BETWEEN 1 AND 10 AND defense BETWEEN 1 AND 10 AND speed BETWEEN 1 AND 10 "
        + "AND teamwork BETWEEN 1 AND 10 AND creativity BETWEEN 1 AND 10 AND problem_solving BETWEEN 1 AND 10 "
        + "AND total_score BETWEEN 6 AND 60 AND evaluator_id <> target_id")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Evaluation extends BaseCreatedAtEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
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
    private int speed;

    @Column(nullable = false)
    private int teamwork;

    @Column(nullable = false)
    private int creativity;

    @Column(name = "problem_solving", nullable = false)
    private int problemSolving;

    @Column(name = "total_score", nullable = false)
    private int totalScore;

    private Evaluation(
            Team team,
            User evaluator,
            User target,
            int attack,
            int defense,
            int speed,
            int teamwork,
            int creativity,
            int problemSolving
    ) {
        this.team = team;
        this.evaluator = evaluator;
        this.target = target;
        this.attack = attack;
        this.defense = defense;
        this.speed = speed;
        this.teamwork = teamwork;
        this.creativity = creativity;
        this.problemSolving = problemSolving;
        this.totalScore = attack + defense + speed + teamwork + creativity + problemSolving;
    }

    public static Evaluation create(
            Team team,
            User evaluator,
            User target,
            int attack,
            int defense,
            int speed,
            int teamwork,
            int creativity,
            int problemSolving
    ) {
        return new Evaluation(team, evaluator, target, attack, defense, speed, teamwork, creativity, problemSolving);
    }
}
