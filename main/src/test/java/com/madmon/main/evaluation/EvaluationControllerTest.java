package com.madmon.main.evaluation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.title.entity.Title;
import com.madmon.main.title.repository.TitleRepository;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.math.BigDecimal;
import java.util.List;
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
class EvaluationControllerTest {

    private static final String RAW_PASSWORD = "initial-password";
    private static final Pattern ACCESS_TOKEN_PATTERN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");
    private static final Pattern INVITE_CODE_PATTERN = Pattern.compile("\"inviteCode\":\"([^\"]+)\"");
    private static final Pattern ID_PATTERN = Pattern.compile("\"id\":(\\d+)");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserStatsRepository userStatsRepository;

    @Autowired
    private TitleRepository titleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Long teamId;
    private Long targetUserId;
    private Long titleId1;
    private Long titleId2;
    private String evaluatorToken;
    private String targetToken;

    @BeforeEach
    void setUp() throws Exception {
        for (String userId : new String[] {"2028001", "2028002", "2028003"}) {
            userRepository.save(User.create(
                    userId, passwordEncoder.encode(RAW_PASSWORD), "user-" + userId,
                    null, null, null, null, null, null, null, null, true
            ));
        }
        titleId1 = titleRepository.save(Title.create("버그 헌터", "버그를 잘 잡는 사람", "bug")).getId();
        titleId2 = titleRepository.save(Title.create("코드 마법사", "코드를 마법처럼 짜는 사람", "magic")).getId();

        evaluatorToken = login("2028001");
        targetToken = login("2028002");

        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"평가팀\"}"))
                .andReturn();
        String body = createResult.getResponse().getContentAsString();
        teamId = Long.valueOf(extract(ID_PATTERN, body));
        String inviteCode = extract(INVITE_CODE_PATTERN, body);

        mockMvc.perform(post("/api/teams/join")
                .header("Authorization", "Bearer " + targetToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"inviteCode\":\"" + inviteCode + "\"}"));

        User target = userRepository.findByUserId("2028002").orElseThrow();
        targetUserId = target.getId();
        target.updateInitialStats(5, 5, 5, 5, 5, 5);
        userStatsRepository.save(UserStats.createFrom(target));

        mockMvc.perform(patch("/api/teams/" + teamId + "/finish")
                .header("Authorization", "Bearer " + evaluatorToken));
    }

    @Test
    void 평가_대상_목록에_아직_평가하지_않은_같은_팀원이_나온다() throws Exception {
        mockMvc.perform(get("/api/evaluations/targets").header("Authorization", "Bearer " + evaluatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].userId").value(targetUserId))
                .andExpect(jsonPath("$.data[0].alreadyEvaluated").value(false));
    }

    @Test
    void 평가를_제출하면_UserStats가_EMA로_갱신된다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(10, 10, 10, 10, 10, 10, List.of())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalScore").value(60));

        UserStats stats = userStatsRepository.findById(targetUserId).orElseThrow();
        // EMA: 0.3 * 10 + 0.7 * 5 = 6.50
        assertEquals(0, new BigDecimal("6.50").compareTo(stats.getAttackScore()));
        assertEquals(1, stats.getEvaluationCount());
    }

    @Test
    void 평가와_함께_칭호에_투표하면_UserTitleStats가_갱신된다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(5, 5, 5, 5, 5, 5, List.of(titleId1, titleId2))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/evaluations/targets").header("Authorization", "Bearer " + evaluatorToken))
                .andExpect(jsonPath("$.data[0].alreadyEvaluated").value(true));
    }

    @Test
    void 같은_대상을_두_번_평가하면_409를_반환한다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                .header("Authorization", "Bearer " + evaluatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(evaluationBody(5, 5, 5, 5, 5, 5, List.of())));

        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(5, 5, 5, 5, 5, 5, List.of())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.EVALUATION_ALREADY_SUBMITTED.name()));
    }

    @Test
    void 자기_자신을_평가하면_400을_반환한다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamId\":" + teamId + ",\"targetUserId\":" + selfId(evaluatorToken)
                                + ",\"attack\":5,\"defense\":5,\"agility\":5,\"teamwork\":5,\"mana\":5,\"health\":5,\"titleIds\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_INPUT_VALUE.name()));
    }

    @Test
    void 프로젝트가_종료되지_않은_팀에서는_평가할_수_없다() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"미종료팀\"}"))
                .andReturn();
        String body = createResult.getResponse().getContentAsString();
        Long newTeamId = Long.valueOf(extract(ID_PATTERN, body));
        String inviteCode = extract(INVITE_CODE_PATTERN, body);

        mockMvc.perform(post("/api/teams/join")
                .header("Authorization", "Bearer " + targetToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"inviteCode\":\"" + inviteCode + "\"}"));

        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(newTeamId, targetUserId, 5, 5, 5, 5, 5, 5, List.of())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PROJECT_NOT_FINISHED.name()));
    }

    @Test
    void 같은_팀_멤버가_아닌_사람을_평가하면_403을_반환한다() throws Exception {
        String outsiderToken = login("2028003");
        User outsider = userRepository.findByUserId("2028003").orElseThrow();

        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(teamId, targetUserId, 5, 5, 5, 5, 5, 5, List.of())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.NOT_TEAM_MEMBER.name()));
    }

    @Test
    void 존재하지_않는_칭호에_투표하면_404를_반환한다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(5, 5, 5, 5, 5, 5, List.of(999999L))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.TITLE_NOT_FOUND.name()));
    }

    @Test
    void 칭호를_중복_선택하면_400을_반환한다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(5, 5, 5, 5, 5, 5, List.of(titleId1, titleId1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_INPUT_VALUE.name()));
    }

    @Test
    void 점수_범위를_벗어나면_400을_반환한다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .header("Authorization", "Bearer " + evaluatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(11, 5, 5, 5, 5, 5, List.of())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_INPUT_VALUE.name()));
    }

    @Test
    void 토큰_없이_평가를_제출하면_401을_반환한다() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(evaluationBody(5, 5, 5, 5, 5, 5, List.of())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.UNAUTHORIZED.name()));
    }

    private Long selfId(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token)).andReturn();
        return Long.valueOf(extract(ID_PATTERN, result.getResponse().getContentAsString()));
    }

    private String evaluationBody(int attack, int defense, int agility, int teamwork, int mana, int health,
            List<Long> titleIds) {
        return evaluationBody(teamId, targetUserId, attack, defense, agility, teamwork, mana, health, titleIds);
    }

    private String evaluationBody(Long teamId, Long targetUserId, int attack, int defense, int agility, int teamwork,
            int mana, int health, List<Long> titleIds) {
        String titleIdsJson = titleIds.stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse("");
        return "{\"teamId\":" + teamId + ",\"targetUserId\":" + targetUserId
                + ",\"attack\":" + attack + ",\"defense\":" + defense + ",\"agility\":" + agility
                + ",\"teamwork\":" + teamwork + ",\"mana\":" + mana + ",\"health\":" + health
                + ",\"titleIds\":[" + titleIdsJson + "]}";
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
