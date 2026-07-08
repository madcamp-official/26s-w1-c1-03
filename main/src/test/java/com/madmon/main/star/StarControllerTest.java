package com.madmon.main.star;

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
class StarControllerTest {

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
    void 토큰_없이_별_목록을_조회하면_401을_반환한다() throws Exception {
        mockMvc.perform(get("/api/stars"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 로그인한_사용자는_별_목록을_조회할_수_있다() throws Exception {
        User viewer = createOnboardedUser("star-ctrl-viewer", "별뷰어");

        mockMvc.perform(get("/api/stars").header("Authorization", "Bearer " + login(viewer.getUserId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].userId").value(viewer.getId()))
                .andExpect(jsonPath("$.data[0].name").value("별뷰어"))
                .andExpect(jsonPath("$.data[0].isUnlocked").value(true))
                .andExpect(jsonPath("$.data[0].stats").exists());
    }

    @Test
    void 평가_대상이_없는_사용자는_별_상세를_바로_볼_수_있다() throws Exception {
        User viewer = createOnboardedUser("star-ctrl-viewer2", "뷰어2");
        User target = createOnboardedUser("star-ctrl-target2", "타겟2");

        mockMvc.perform(get("/api/stars/" + target.getId())
                        .header("Authorization", "Bearer " + login(viewer.getUserId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isUnlocked").value(true))
                .andExpect(jsonPath("$.data.remainingCount").value(0))
                .andExpect(jsonPath("$.data.biography").exists());
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
