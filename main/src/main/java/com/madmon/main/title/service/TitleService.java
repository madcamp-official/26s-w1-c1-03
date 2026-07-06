package com.madmon.main.title.service;

import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.evaluation.entity.Evaluation;
import com.madmon.main.title.dto.TitleResponse;
import com.madmon.main.title.entity.Title;
import com.madmon.main.title.entity.TitleVote;
import com.madmon.main.title.entity.UserTitleStats;
import com.madmon.main.title.entity.UserTitleStatsId;
import com.madmon.main.title.repository.TitleRepository;
import com.madmon.main.title.repository.TitleVoteRepository;
import com.madmon.main.title.repository.UserTitleStatsRepository;
import com.madmon.main.user.entity.User;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TitleService {

    private final TitleRepository titleRepository;
    private final TitleVoteRepository titleVoteRepository;
    private final UserTitleStatsRepository userTitleStatsRepository;

    public List<TitleResponse> getAllTitles() {
        return titleRepository.findAll().stream()
                .map(TitleResponse::of)
                .toList();
    }

    @Transactional
    public void registerVotes(Evaluation evaluation, User target, List<Long> titleIds) {
        for (Long titleId : titleIds) {
            Title title = titleRepository.findById(titleId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.TITLE_NOT_FOUND));

            titleVoteRepository.save(TitleVote.of(evaluation, title));
            incrementUserTitleStats(target, title);
        }
    }

    private void incrementUserTitleStats(User target, Title title) {
        UserTitleStats stats = userTitleStatsRepository
                .findById(new UserTitleStatsId(target.getId(), title.getId()))
                .orElseGet(() -> userTitleStatsRepository.save(UserTitleStats.of(target, title, 0)));
        stats.incrementVoteCount();
    }
}
