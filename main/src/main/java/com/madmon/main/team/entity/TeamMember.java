package com.madmon.main.team.entity;

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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "team_members",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_team_members_team_user", columnNames = {"team_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_team_members_user_id", columnList = "user_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

    private TeamMember(Team team, User user) {
        this.team = team;
        this.user = user;
        this.joinedAt = Instant.now();
    }

    public static TeamMember join(Team team, User user) {
        return new TeamMember(team, user);
    }

    public void leave() {
        this.leftAt = Instant.now();
    }

    public void rejoin() {
        this.leftAt = null;
        this.joinedAt = Instant.now();
    }

    // 마감기한이 지났고(now >= project_deadline), 그 이전에 합류한 멤버십만 평가 대상으로 본다.
    // 마감 이후에 새로 합류한 사람은 해당 프로젝트 기간에 속하지 않았으므로 제외한다.
    public boolean isEvaluationEligible() {
        Instant deadline = team.getProjectDeadline();
        boolean deadlinePassed = !Instant.now().isBefore(deadline);
        boolean joinedBeforeDeadline = !joinedAt.isAfter(deadline);
        return deadlinePassed && joinedBeforeDeadline;
    }
}
