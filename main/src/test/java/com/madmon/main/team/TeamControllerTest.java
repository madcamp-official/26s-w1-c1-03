package com.madmon.main.team;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.evaluation.entity.Evaluation;
import com.madmon.main.evaluation.repository.EvaluationRepository;
import com.madmon.main.team.repository.TeamMemberRepository;
import com.madmon.main.team.repository.TeamRepository;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.profiles.active=test")
@AutoConfigureMockMvc
@Transactional
class TeamControllerTest {

    private static final String RAW_PASSWORD = "initial-password";
    private static final Pattern ACCESS_TOKEN_PATTERN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");
    private static final Pattern INVITE_CODE_PATTERN = Pattern.compile("\"inviteCode\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserStatsRepository userStatsRepository;

    @Autowired
    private EvaluationRepository evaluationRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamMemberRepository teamMemberRepository;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        for (String userId : new String[] {"2027001", "2027002", "2027003"}) {
            userRepository.save(User.create(
                    userId, passwordEncoder.encode(RAW_PASSWORD), "user-" + userId,
                    null, null, null, null, null, null, null, null, true
            ));
        }
    }

    @Test
    void 팀을_생성하면_생성자가_자동으로_팀장_겸_멤버가_된다() throws Exception {
        mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Alpha Team")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Alpha Team"))
                .andExpect(jsonPath("$.data.ownerName").value("user-2027001"))
                .andExpect(jsonPath("$.data.memberCount").value(1))
                .andExpect(jsonPath("$.data.inviteCode").isNotEmpty());
    }

    @Test
    void 초대_코드로_다른_사용자가_팀에_참여할_수_있다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Beta Team")))
                .andReturn();
        String inviteCode = extract(INVITE_CODE_PATTERN, createResult.getResponse().getContentAsString());

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + login("2027002"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberCount").value(2));
    }

    @Test
    void 존재하지_않는_초대_코드로_참여하면_404를_반환한다() throws Exception {
        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"ZZZZZZ\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.TEAM_NOT_FOUND.name()));
    }

    @Test
    void 이미_참여_중인_팀에_다시_참여하면_409를_반환한다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Gamma Team")))
                .andReturn();
        String inviteCode = extract(INVITE_CODE_PATTERN, createResult.getResponse().getContentAsString());

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.ALREADY_TEAM_MEMBER.name()));
    }

    @Test
    void 팀을_탈퇴한_뒤_같은_초대_코드로_재참여할_수_있다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Delta Team")))
                .andReturn();
        String inviteCode = extract(INVITE_CODE_PATTERN, createResult.getResponse().getContentAsString());
        String memberToken = login("2027002");

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isOk());

        MvcResult teamsResult = mockMvc.perform(get("/api/teams").header("Authorization", "Bearer " + memberToken))
                .andReturn();
        Long teamId = extractTeamId(teamsResult.getResponse().getContentAsString());

        mockMvc.perform(delete("/api/teams/" + teamId + "/members/me")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberCount").value(2));
    }

    @Test
    void 마감_기한이_지난_팀에_참여하면_409를_반환한다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Eta Team", Instant.now().minusSeconds(3600))))
                .andReturn();
        String inviteCode = extract(INVITE_CODE_PATTERN, createResult.getResponse().getContentAsString());

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + login("2027002"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.TEAM_DEADLINE_PASSED.name()));
    }

    @Test
    void 마감_기한이_지난_팀은_탈퇴_후_재참여도_거부된다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Theta Team", Instant.now().plusSeconds(2))))
                .andReturn();
        String inviteCode = extract(INVITE_CODE_PATTERN, createResult.getResponse().getContentAsString());
        String memberToken = login("2027002");

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isOk());

        MvcResult teamsResult = mockMvc.perform(get("/api/teams").header("Authorization", "Bearer " + memberToken))
                .andReturn();
        Long teamId = extractTeamId(teamsResult.getResponse().getContentAsString());

        mockMvc.perform(delete("/api/teams/" + teamId + "/members/me")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk());

        Thread.sleep(2100);

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.TEAM_DEADLINE_PASSED.name()));
    }

    @Test
    void 내가_속한_팀_목록만_조회된다() throws Exception {
        String tokenA = login("2027001");
        String tokenB = login("2027002");

        mockMvc.perform(post("/api/teams").header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON).content(createTeamJson("Team1")));
        mockMvc.perform(post("/api/teams").header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON).content(createTeamJson("Team2")));
        mockMvc.perform(post("/api/teams").header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON).content(createTeamJson("Team3")));

        mockMvc.perform(get("/api/teams").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void 팀_멤버가_아니면_상세_조회시_403을_반환한다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Epsilon Team")))
                .andReturn();
        Long teamId = extractTeamId(createResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/teams/" + teamId).header("Authorization", "Bearer " + login("2027003")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.NOT_TEAM_MEMBER.name()));
    }

    @Test
    void 팀_상세_조회시_멤버_목록이_반환된다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + login("2027001"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Zeta Team")))
                .andReturn();
        Long teamId = extractTeamId(createResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/teams/" + teamId).header("Authorization", "Bearer " + login("2027001")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.members.length()").value(1))
                .andExpect(jsonPath("$.data.members[0].isOwner").value(true));
    }

    @Test
    void 토큰_없이_팀_생성을_요청하면_401을_반환한다() throws Exception {
        mockMvc.perform(post("/api/teams")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"NoAuth\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.UNAUTHORIZED.name()));
    }

    @Test
    void 팀의_마지막_멤버가_나가면_팀이_삭제되고_평가_기록은_보존된다() throws Exception {
        long deadlineBufferMs = 300;
        String ownerToken = login("2027001");
        String memberToken = login("2027002");

        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTeamJson("Iota Team", Instant.now().plusMillis(deadlineBufferMs))))
                .andReturn();
        String body = createResult.getResponse().getContentAsString();
        Long teamId = extractTeamId(body);
        String inviteCode = extract(INVITE_CODE_PATTERN, body);

        mockMvc.perform(post("/api/teams/join")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"" + inviteCode + "\"}"))
                .andExpect(status().isOk());

        User member = userRepository.findByUserId("2027002").orElseThrow();
        member.updateInitialStats(5, 5, 5, 5, 5, 5);
        userStatsRepository.save(UserStats.createFrom(member));

        // 마감기한이 지나야 평가가 가능해지므로 그만큼 대기한다.
        Thread.sleep(deadlineBufferMs + 200);

        MvcResult evalResult = mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamId\":" + teamId + ",\"targetUserId\":" + member.getId()
                                + ",\"attack\":5,\"defense\":5,\"agility\":5,\"teamwork\":5,\"mana\":5,\"health\":5,"
                                + "\"titleIds\":[]}"))
                .andExpect(status().isOk())
                .andReturn();
        Long evaluationId = Long.valueOf(extract(Pattern.compile("\"id\":(\\d+)"),
                evalResult.getResponse().getContentAsString()));
        // 테스트 전체가 하나의 트랜잭션/영속성 컨텍스트를 공유하므로, 방금 로드된 Evaluation이
        // 이후 팀 삭제 시점까지 Team에 대한 스테일 참조를 관리 상태로 들고 있지 않도록 비워준다
        // (실제 서비스에서는 요청마다 영속성 컨텍스트가 분리되어 있어 발생하지 않는 테스트 전용 이슈).
        entityManager.flush();
        entityManager.clear();

        // 첫 번째 멤버(owner)가 나가도 팀에는 여전히 활성 멤버(member)가 남아 있으므로 팀은 유지된다.
        mockMvc.perform(delete("/api/teams/" + teamId + "/members/me")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/teams/" + teamId).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk());

        // 마지막 남은 멤버까지 나가면 팀 자체가 삭제된다.
        mockMvc.perform(delete("/api/teams/" + teamId + "/members/me")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/teams/" + teamId).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.TEAM_NOT_FOUND.name()));
        assertTrue(teamRepository.findById(teamId).isEmpty());
        assertTrue(teamMemberRepository.findAllByTeamId(teamId).isEmpty());

        // 팀은 사라졌지만 그 팀에서 남긴 평가 기록/점수는 team_id만 null이 된 채 그대로 남아야 한다.
        entityManager.flush();
        entityManager.clear();
        Evaluation evaluation = evaluationRepository.findById(evaluationId).orElseThrow();
        assertNull(evaluation.getTeam());
        assertEquals(30, evaluation.getTotalScore());
    }

    private Long extractTeamId(String json) {
        Matcher matcher = Pattern.compile("\"id\":(\\d+)").matcher(json);
        if (!matcher.find()) {
            throw new IllegalStateException("응답에서 팀 id를 찾을 수 없습니다: " + json);
        }
        return Long.valueOf(matcher.group(1));
    }

    private String createTeamJson(String name) {
        return createTeamJson(name, Instant.now().plusSeconds(86400));
    }

    private String createTeamJson(String name, Instant projectDeadline) {
        return "{\"name\":\"" + name + "\",\"projectDeadline\":\"" + projectDeadline + "\"}";
    }

    private String extract(Pattern pattern, String content) {
        Matcher matcher = pattern.matcher(content);
        if (!matcher.find()) {
            throw new IllegalStateException("패턴을 찾을 수 없습니다: " + content);
        }
        return matcher.group(1);
    }

    private String login(String userId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"password\":\"" + RAW_PASSWORD + "\"}"))
                .andReturn();

        return extract(ACCESS_TOKEN_PATTERN, result.getResponse().getContentAsString());
    }
}
