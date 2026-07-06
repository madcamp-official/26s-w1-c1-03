package com.madmon.main.phase3;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.madmon.main.chat.entity.ChatCard;
import com.madmon.main.chat.entity.ChatMessage;
import com.madmon.main.chat.entity.ChatMessageRole;
import com.madmon.main.chat.entity.ChatSession;
import com.madmon.main.chat.repository.ChatCardRepository;
import com.madmon.main.chat.repository.ChatMessageRepository;
import com.madmon.main.chat.repository.ChatSessionRepository;
import com.madmon.main.evaluation.entity.Evaluation;
import com.madmon.main.evaluation.repository.EvaluationRepository;
import com.madmon.main.team.entity.Team;
import com.madmon.main.team.entity.TeamMember;
import com.madmon.main.team.repository.TeamMemberRepository;
import com.madmon.main.team.repository.TeamRepository;
import com.madmon.main.title.entity.Title;
import com.madmon.main.title.entity.TitleVote;
import com.madmon.main.title.entity.UserTitleStats;
import com.madmon.main.title.repository.TitleRepository;
import com.madmon.main.title.repository.TitleVoteRepository;
import com.madmon.main.title.repository.UserTitleStatsRepository;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.profiles.active=test")
@Transactional
class Phase3RepositoryCrudTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserStatsRepository userStatsRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamMemberRepository teamMemberRepository;

    @Autowired
    private EvaluationRepository evaluationRepository;

    @Autowired
    private TitleRepository titleRepository;

    @Autowired
    private TitleVoteRepository titleVoteRepository;

    @Autowired
    private UserTitleStatsRepository userTitleStatsRepository;

    @Autowired
    private ChatSessionRepository chatSessionRepository;

    @Autowired
    private ChatCardRepository chatCardRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Test
    void user_and_user_stats_crud() {
        User user = userRepository.save(User.create(
                "2026001",
                "hashed-password",
                "kim-dev",
                null,
                "간단한 자기소개",
                2,
                3,
                4,
                5,
                6,
                7,
                false
        ));

        UserStats userStats = userStatsRepository.save(UserStats.createFrom(user));

        assertNotNull(user.getId());
        assertTrue(userRepository.existsByUserId("2026001"));
        assertEquals(0, BigDecimal.valueOf(2).compareTo(userStats.getAttackScore()));
        assertEquals(0, userStats.getEvaluationCount());
        assertEquals(user.getId(), userStats.getUserId());
        assertTrue(userStatsRepository.findById(user.getId()).isPresent());
    }

    @Test
    void team_and_member_crud() {
        User owner = userRepository.save(User.create("2026002", "owner-password", "owner", null, null, 1, 1, 1, 1, 1, 1, false));
        User member = userRepository.save(User.create("2026003", "member-password", "member", null, null, 1, 1, 1, 1, 1, 1, false));
        Team team = teamRepository.save(Team.create("Alpha Team", "A1B2C3", owner, Instant.now().plusSeconds(86400)));
        TeamMember teamMember = teamMemberRepository.save(TeamMember.join(team, member));

        assertTrue(teamRepository.findByInviteCode("A1B2C3").isPresent());
        assertTrue(teamMemberRepository.existsByTeamIdAndUserId(team.getId(), member.getId()));
        assertEquals(1, teamMemberRepository.findAllByTeamId(team.getId()).size());
        assertEquals(team.getId(), teamMember.getTeam().getId());
        assertEquals(member.getId(), teamMember.getUser().getId());
    }

    @Test
    void evaluation_title_vote_and_title_stats_crud() {
        User evaluator = userRepository.save(User.create("2026004", "evaluator-password", "evaluator", null, null, 1, 1, 1, 1, 1, 1, false));
        User target = userRepository.save(User.create("2026005", "target-password", "target", null, null, 1, 1, 1, 1, 1, 1, false));
        Team team = teamRepository.save(Team.create("Beta Team", "D4E5F6", evaluator, Instant.now().plusSeconds(86400)));
        Title title = titleRepository.save(Title.create("프론트엔드 장인", "화면을 잘 만드는 사람", "frontend-master"));

        Evaluation evaluation = evaluationRepository.save(Evaluation.create(team, evaluator, target, 10, 9, 8, 7, 6, 5));
        TitleVote titleVote = titleVoteRepository.save(TitleVote.of(evaluation, title));
        UserTitleStats userTitleStats = userTitleStatsRepository.save(UserTitleStats.of(target, title, 1));

        assertTrue(evaluationRepository.existsByTeamIdAndEvaluatorIdAndTargetId(team.getId(), evaluator.getId(), target.getId()));
        assertTrue(titleVoteRepository.existsByEvaluationIdAndTitleId(evaluation.getId(), title.getId()));

        List<UserTitleStats> stats = userTitleStatsRepository.findAllByUser_IdOrderByVoteCountDesc(target.getId());
        assertEquals(1, stats.size());
        assertEquals(1, stats.get(0).getVoteCount());
        assertEquals(target.getId(), userTitleStats.getUser().getId());
        assertEquals(title.getId(), userTitleStats.getTitle().getId());
        assertEquals(45, evaluation.getTotalScore());
    }

    @Test
    void chat_session_card_and_message_crud() {
        User host = userRepository.save(User.create("2026006", "host-password", "host", null, null, 1, 1, 1, 1, 1, 1, false));
        User target = userRepository.save(User.create("2026007", "chat-target-password", "chat-target", null, null, 1, 1, 1, 1, 1, 1, false));
        ChatSession session = chatSessionRepository.save(ChatSession.create(host, "팀 시너지 분석"));
        ChatCard chatCard = chatCardRepository.save(ChatCard.create(session, target));
        ChatMessage userMessage = chatMessageRepository.save(ChatMessage.create(session, ChatMessageRole.USER, "이 팀의 강점은?"));
        ChatMessage assistantMessage = chatMessageRepository.save(ChatMessage.create(session, ChatMessageRole.ASSISTANT, "협업 속도가 강점입니다."));

        assertEquals(1, chatSessionRepository.findAllByUserIdOrderByCreatedAtDesc(host.getId()).size());
        assertEquals(1, chatCardRepository.findAllBySessionId(session.getId()).size());
        assertEquals(2, chatMessageRepository.findAllBySessionIdOrderByCreatedAtAsc(session.getId()).size());
        assertEquals(ChatMessageRole.USER, userMessage.getRole());
        assertEquals(ChatMessageRole.ASSISTANT, assistantMessage.getRole());
        assertEquals(target.getId(), chatCard.getTargetUser().getId());
        assertFalse(session.getSessionTitle().isBlank());
    }
}
