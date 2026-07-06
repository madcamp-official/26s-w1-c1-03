package com.madmon.main.user.service;

import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.user.dto.InitialStatsRequest;
import com.madmon.main.user.dto.UpdateProfileRequest;
import com.madmon.main.user.dto.UserProfileResponse;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserStatsRepository userStatsRepository;

    public UserProfileResponse getMyProfile(Long userId) {
        User user = getUser(userId);
        UserStats stats = userStatsRepository.findById(userId).orElse(null);
        return UserProfileResponse.of(user, stats);
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getUser(userId);
        user.updateProfile(request.profileImageUrl(), request.biography());

        UserStats stats = userStatsRepository.findById(userId).orElse(null);
        return UserProfileResponse.of(user, stats);
    }

    @Transactional
    public UserProfileResponse setInitialStats(Long userId, InitialStatsRequest request) {
        User user = getUser(userId);

        if (userStatsRepository.existsById(userId)) {
            throw new BusinessException(ErrorCode.INITIAL_STATS_ALREADY_SET);
        }

        user.updateInitialStats(
                request.attack(),
                request.defense(),
                request.speed(),
                request.teamwork(),
                request.creativity(),
                request.problemSolving()
        );

        UserStats stats = userStatsRepository.save(UserStats.createFrom(user));
        return UserProfileResponse.of(user, stats);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }
}
