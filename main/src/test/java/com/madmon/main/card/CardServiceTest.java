package com.madmon.main.card;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.madmon.main.card.dto.CardDetailResponse;
import com.madmon.main.card.dto.CardSummaryResponse;
import com.madmon.main.card.service.CardService;
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
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.profiles.active=test")
@Transactional
class CardServiceTest {

    @Autowired
    private CardService cardService;

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

    @Test
    void 카드_목록에는_온보딩된_사용자만_포함된다() {
        User onboarded = createOnboardedUser("card-u1", "김철수");
        userRepository.save(User.create(
                "card-u2", "hash", "미완료유저", null, null, null, null, null, null, null, null, false
        ));

        List<CardSummaryResponse> cards = cardService.getCards(onboarded.getId());

        assertEquals(1, cards.size());
        assertEquals(onboarded.getId(), cards.get(0).userId());
        assertNotNull(cards.get(0).stats());
    }

    @Test
    void 평가_대상_팀이_없으면_잠금_없이_상세를_볼_수_있다() {
        User viewer = createOnboardedUser("card-viewer1", "뷰어1");
        User target = createOnboardedUser("card-target1", "타겟1");

        CardDetailResponse detail = cardService.getCardDetail(viewer.getId(), target.getId());

        assertTrue(detail.isUnlocked());
        assertEquals(0, detail.remainingCount());
        assertEquals("타겟1", detail.name());
        assertNotNull(detail.stats());
        assertTrue(detail.biography() != null || target.getBiography() == null);
    }

    @Test
    void 팀원_평가를_완료하지_않으면_카드_상세가_잠긴다() {
        User viewer = createOnboardedUser("card-viewer2", "뷰어2");
        User teammate = createOnboardedUser("card-teammate2", "팀원2");

        Team team = teamRepository.save(Team.create("팀2", "COD002", viewer));
        TeamMember viewerMembership = teamMemberRepository.save(TeamMember.join(team, viewer));
        viewerMembership.markProjectFinished();
        teamMemberRepository.save(TeamMember.join(team, teammate));

        CardDetailResponse detail = cardService.getCardDetail(viewer.getId(), teammate.getId());

        assertFalse(detail.isUnlocked());
        assertEquals(1, detail.remainingCount());
        assertNull(detail.biography());
        assertNull(detail.titles());
        assertNull(detail.stats());
        // 잠금 상태에서도 이름/대표 칭호 같은 앞면 요약 정보는 그대로 노출되어야 한다.
        assertEquals("팀원2", detail.name());
    }

    @Test
    void 평가를_완료하지_않으면_카드_목록에서도_능력치가_가려진다() {
        User viewer = createOnboardedUser("card-viewer5", "뷰어5");
        User teammate = createOnboardedUser("card-teammate5", "팀원5");

        Team team = teamRepository.save(Team.create("팀5", "COD005", viewer));
        TeamMember viewerMembership = teamMemberRepository.save(TeamMember.join(team, viewer));
        viewerMembership.markProjectFinished();
        teamMemberRepository.save(TeamMember.join(team, teammate));

        List<CardSummaryResponse> cards = cardService.getCards(viewer.getId());

        assertEquals(2, cards.size());
        for (CardSummaryResponse card : cards) {
            assertFalse(card.isUnlocked());
            assertEquals(1, card.remainingCount());
            assertNull(card.stats());
        }
    }

    @Test
    void 팀원_전원을_평가하면_즉시_잠금이_해제된다() {
        User viewer = createOnboardedUser("card-viewer3", "뷰어3");
        User teammate = createOnboardedUser("card-teammate3", "팀원3");

        Team team = teamRepository.save(Team.create("팀3", "COD003", viewer));
        TeamMember viewerMembership = teamMemberRepository.save(TeamMember.join(team, viewer));
        viewerMembership.markProjectFinished();
        teamMemberRepository.save(TeamMember.join(team, teammate));

        evaluationRepository.save(Evaluation.create(team, viewer, teammate, 5, 5, 5, 5, 5, 5));

        CardDetailResponse detail = cardService.getCardDetail(viewer.getId(), teammate.getId());

        assertTrue(detail.isUnlocked());
        assertEquals(0, detail.remainingCount());
        assertEquals("팀원3", detail.name());
        assertNotNull(detail.stats());
    }

    @Test
    void 동점_칭호는_모두_대표_칭호로_표시된다() {
        User evaluator = createOnboardedUser("card-evaluator4", "평가자4");
        User target = createOnboardedUser("card-target4", "타겟4");

        Team team = teamRepository.save(Team.create("팀4", "COD004", evaluator));
        teamMemberRepository.save(TeamMember.join(team, evaluator));
        teamMemberRepository.save(TeamMember.join(team, target));

        Title titleA = titleRepository.save(Title.create("타이틀A" + System.nanoTime(), "설명A", "icon-a"));
        Title titleB = titleRepository.save(Title.create("타이틀B" + System.nanoTime(), "설명B", "icon-b"));

        Evaluation evaluation = evaluationRepository.save(Evaluation.create(team, evaluator, target, 5, 5, 5, 5, 5, 5));
        titleVoteRepository.save(TitleVote.of(evaluation, titleA));
        titleVoteRepository.save(TitleVote.of(evaluation, titleB));
        userTitleStatsRepository.save(UserTitleStats.of(target, titleA, 3));
        userTitleStatsRepository.save(UserTitleStats.of(target, titleB, 3));

        List<CardSummaryResponse> cards = cardService.getCards(evaluator.getId());
        CardSummaryResponse targetCard = cards.stream()
                .filter(card -> card.userId().equals(target.getId()))
                .findFirst()
                .orElseThrow();

        assertEquals(2, targetCard.representativeTitles().size());
        assertTrue(targetCard.representativeTitles().containsAll(List.of(titleA.getName(), titleB.getName())));
    }

    private User createOnboardedUser(String userId, String name) {
        User user = userRepository.save(User.create(
                userId, "hash", name, null, "자기소개-" + userId, 5, 5, 5, 5, 5, 5, true
        ));
        userStatsRepository.save(UserStats.createFrom(user));
        return user;
    }
}
