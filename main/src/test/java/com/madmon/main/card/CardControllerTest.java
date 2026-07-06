package com.madmon.main.card;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.profiles.active=test")
@AutoConfigureMockMvc
@Transactional
class CardControllerTest {

    private static final Pattern ACCESS_TOKEN_PATTERN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserStatsRepository userStatsRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void 토큰_없이_카드_목록을_조회하면_401을_반환한다() throws Exception {
        mockMvc.perform(get("/api/cards"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 로그인한_사용자는_카드_목록을_조회할_수_있다() throws Exception {
        User viewer = createOnboardedUser("card-ctrl-viewer", "카드뷰어");

        mockMvc.perform(get("/api/cards").header("Authorization", "Bearer " + login(viewer.getUserId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].userId").value(viewer.getId()))
                .andExpect(jsonPath("$.data[0].name").value("카드뷰어"))
                .andExpect(jsonPath("$.data[0].isUnlocked").value(false))
                .andExpect(jsonPath("$.data[0].stats").doesNotExist());
    }

    @Test
    void 팀에_속해_있지_않으면_카드_상세도_잠긴다() throws Exception {
        User viewer = createOnboardedUser("card-ctrl-viewer2", "뷰어2");
        User target = createOnboardedUser("card-ctrl-target2", "타겟2");

        mockMvc.perform(get("/api/cards/" + target.getId())
                        .header("Authorization", "Bearer " + login(viewer.getUserId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isUnlocked").value(false))
                .andExpect(jsonPath("$.data.remainingCount").value(0))
                .andExpect(jsonPath("$.data.biography").doesNotExist());
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
