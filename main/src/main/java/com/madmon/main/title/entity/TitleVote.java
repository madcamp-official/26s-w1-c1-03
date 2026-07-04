package com.madmon.main.title.entity;

import com.madmon.main.common.entity.BaseCreatedAtEntity;
import com.madmon.main.evaluation.entity.Evaluation;
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

@Getter
@Entity
@Table(
        name = "title_votes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_title_votes_evaluation_title", columnNames = {"evaluation_id", "title_id"})
        },
        indexes = {
                @Index(name = "idx_title_votes_title_id", columnList = "title_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TitleVote extends BaseCreatedAtEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "title_id", nullable = false)
    private Title title;

    private TitleVote(Evaluation evaluation, Title title) {
        this.evaluation = evaluation;
        this.title = title;
    }

    public static TitleVote of(Evaluation evaluation, Title title) {
        return new TitleVote(evaluation, title);
    }
}
