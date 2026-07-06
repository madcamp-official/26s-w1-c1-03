package com.madmon.main.title;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.title.entity.Title;
import com.madmon.main.title.repository.TitleRepository;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.repository.UserRepository;
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
class TitleControllerTest {

    private static final String TEST_USER_ID = "2028900";
    private static final String RAW_PASSWORD = "initial-password";
    private static final Pattern ACCESS_TOKEN_PATTERN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TitleRepository titleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.save(User.create(
                TEST_USER_ID, passwordEncoder.encode(RAW_PASSWORD), "테스트유저",
                null, null, null, null, null, null, null, null, true
        ));
        titleRepository.save(Title.create("팀 플레이어", "협업을 잘하는 사람", "team"));
        titleRepository.save(Title.create("문제 해결사", "문제를 잘 푸는 사람", "solver"));
    }

    @Test
    void 칭호_목록을_조회할_수_있다() throws Exception {
        mockMvc.perform(get("/api/titles").header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].name").isNotEmpty());
    }

    @Test
    void 토큰_없이_칭호_목록을_조회하면_401을_반환한다() throws Exception {
        mockMvc.perform(get("/api/titles"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.UNAUTHORIZED.name()));
    }

    private String login() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + TEST_USER_ID + "\",\"password\":\"" + RAW_PASSWORD + "\"}"))
                .andReturn();

        Matcher matcher = ACCESS_TOKEN_PATTERN.matcher(result.getResponse().getContentAsString());
        if (!matcher.find()) {
            throw new IllegalStateException("로그인 응답에서 accessToken을 찾을 수 없습니다: " + result.getResponse().getContentAsString());
        }
        return matcher.group(1);
    }
}
