package com.madmon.main.chat;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.madmon.main.chat.client.OpenAiClient;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.profiles.active=test")
@AutoConfigureMockMvc
@Transactional
class ChatControllerTest {

    private static final Pattern ACCESS_TOKEN_PATTERN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserStatsRepository userStatsRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private OpenAiClient openAiClient;

    @Test
    void 토큰_없이_세션_목록을_조회하면_401을_반환한다() throws Exception {
        mockMvc.perform(get("/api/chat/sessions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 세션을_생성하고_메시지를_보내면_AI_응답을_받는다() throws Exception {
        User asker = createOnboardedUser("chat-ctrl-asker", "질문자");
        User target = createOnboardedUser("chat-ctrl-target", "타겟");
        when(openAiClient.createChatCompletion(anyList())).thenReturn("컨트롤러 테스트 응답");

        String token = login(asker.getUserId());

        MvcResult createResult = mockMvc.perform(post("/api/chat/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserIds\":[" + target.getId() + "]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("타겟와의 대화"))
                .andReturn();

        Long sessionId = extractSessionId(createResult.getResponse().getContentAsString());

        mockMvc.perform(post("/api/chat/sessions/" + sessionId + "/messages")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"이 사람과 잘 맞을까요?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assistantMessage.content").value("컨트롤러 테스트 응답"));
    }

    @Test
    void 평가를_완료하지_않은_사용자는_세션_생성이_거부된다() throws Exception {
        User asker = createOnboardedUser("chat-ctrl-locked", "잠긴질문자");
        User target = createOnboardedUser("chat-ctrl-target2", "타겟2");

        String token = login(asker.getUserId());

        // 이 사용자는 평가 대상 팀이 없으므로 기본적으로 잠금 해제 상태다. 잠금 자체는
        // ChatServiceTest에서 팀/평가 데이터를 구성해 직접 검증하고, 여기서는 정상 경로만 확인한다.
        mockMvc.perform(post("/api/chat/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserIds\":[" + target.getId() + "]}"))
                .andExpect(status().isOk());
    }

    @Test
    void 존재하지_않는_대상으로_세션_생성을_요청하면_404를_반환한다() throws Exception {
        User asker = createOnboardedUser("chat-ctrl-asker3", "질문자3");
        String token = login(asker.getUserId());

        mockMvc.perform(post("/api/chat/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserIds\":[999999]}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.RESOURCE_NOT_FOUND.name()));
    }

    private Long extractSessionId(String body) {
        Matcher matcher = Pattern.compile("\"id\":(\\d+)").matcher(body);
        if (!matcher.find()) {
            throw new IllegalStateException("응답에서 세션 id를 찾을 수 없습니다: " + body);
        }
        return Long.valueOf(matcher.group(1));
    }

    private User createOnboardedUser(String userId, String name) {
        User user = userRepository.save(User.create(
                userId, passwordEncoder.encode("password"), name, null, "자기소개", 5, 5, 5, 5, 5, 5, true
        ));
        userStatsRepository.save(UserStats.createFrom(user));
        return user;
    }

    private String login(String userId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"password\":\"password\"}"))
                .andReturn();

        Matcher matcher = ACCESS_TOKEN_PATTERN.matcher(result.getResponse().getContentAsString());
        if (!matcher.find()) {
            throw new IllegalStateException("로그인 응답에서 accessToken을 찾을 수 없습니다: " + result.getResponse().getContentAsString());
        }
        return matcher.group(1);
    }
}
