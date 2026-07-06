package com.madmon.main.team.entity;

import com.madmon.main.common.entity.BaseEntity;
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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "teams",
        uniqueConstraints = {
                @jakarta.persistence.UniqueConstraint(name = "uk_teams_invite_code", columnNames = "invite_code")
        },
        indexes = {
                @Index(name = "idx_teams_owner_id", columnList = "owner_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Team extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "invite_code", nullable = false, length = 6)
    private String inviteCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    // 팀 생성 시 1회 입력받고 이후 수정하지 않는 고정값. 이 시각이 지나야 팀원 간 평가가 가능해진다.
    @Column(name = "project_deadline", nullable = false)
    private Instant projectDeadline;

    private Team(String name, String inviteCode, User owner, Instant projectDeadline) {
        this.name = name;
        this.inviteCode = inviteCode;
        this.owner = owner;
        this.projectDeadline = projectDeadline;
    }

    public static Team create(String name, String inviteCode, User owner, Instant projectDeadline) {
        return new Team(name, inviteCode, owner, projectDeadline);
    }

    public void rename(String name) {
        this.name = name;
    }
}
