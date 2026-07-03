package com.madmon.main.title.entity;

import com.madmon.main.common.entity.BaseEntity;
import com.madmon.main.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "user_title_stats")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserTitleStats extends BaseEntity {

    @EmbeddedId
    private UserTitleStatsId id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @MapsId("titleId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "title_id", nullable = false)
    private Title title;

    @Column(name = "vote_count", nullable = false)
    private int voteCount;

    private UserTitleStats(User user, Title title, int voteCount) {
        this.id = new UserTitleStatsId(user.getId(), title.getId());
        this.user = user;
        this.title = title;
        this.voteCount = voteCount;
    }

    public static UserTitleStats of(User user, Title title, int voteCount) {
        return new UserTitleStats(user, title, voteCount);
    }

    public void incrementVoteCount() {
        this.voteCount++;
    }
}
