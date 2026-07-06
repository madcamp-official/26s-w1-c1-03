package com.madmon.main.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.storage.service.StorageService;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.entity.UserStats;
import com.madmon.main.user.repository.UserRepository;
import com.madmon.main.user.repository.UserStatsRepository;
import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.profiles.active=test")
@AutoConfigureMockMvc
@Transactional
class UserControllerTest {

    private static final String TEST_USER_ID = "2026200";
    private static final String RAW_PASSWORD = "initial-password";
    private static final Pattern ACCESS_TOKEN_PATTERN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserStatsRepository userStatsRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 실제 Supabase Storage 호출은 별도로 검증하고, 여기서는 라우팅/인증/DB 반영만 검증한다.
    @MockitoBean
    private StorageService storageService;

    private User user;

    @BeforeEach
    void setUp() {
        // 비밀번호는 이미 변경된 상태로 시드해 User API 테스트를 인증 게이팅 흐름과 분리한다
        // (비밀번호 변경 흐름 자체는 AuthControllerTest에서 검증).
        user = userRepository.save(User.create(
                TEST_USER_ID, passwordEncoder.encode(RAW_PASSWORD), "테스트유저",
                null, null, null, null, null, null, null, null, true
        ));
    }

    @Test
    void 로그인한_사용자는_자신의_프로필을_조회할_수_있다() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(TEST_USER_ID))
                .andExpect(jsonPath("$.data.onboarded").value(false))
                .andExpect(jsonPath("$.data.stats").doesNotExist());
    }

    @Test
    void 토큰_없이_프로필을_조회하면_401을_반환한다() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.UNAUTHORIZED.name()));
    }

    @Test
    void 프로필_수정에_성공하면_자기소개와_프로필사진이_반영된다() throws Exception {
        mockMvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"profileImageUrl\":\"https://example.com/a.png\",\"biography\":\"안녕하세요\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.profileImageUrl").value("https://example.com/a.png"))
                .andExpect(jsonPath("$.data.biography").value("안녕하세요"));

        User updated = userRepository.findByUserId(TEST_USER_ID).orElseThrow();
        assertEquals("안녕하세요", updated.getBiography());
        assertEquals("https://example.com/a.png", updated.getProfileImageUrl());
    }

    @Test
    void 프로필사진_없이_자기소개만_수정해도_기존_프로필사진은_유지된다() throws Exception {
        String token = login();
        mockMvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"profileImageUrl\":\"https://example.com/a.png\",\"biography\":\"첫 소개\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"biography\":\"수정된 소개\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.profileImageUrl").value("https://example.com/a.png"))
                .andExpect(jsonPath("$.data.biography").value("수정된 소개"));

        User updated = userRepository.findByUserId(TEST_USER_ID).orElseThrow();
        assertEquals("수정된 소개", updated.getBiography());
        assertEquals("https://example.com/a.png", updated.getProfileImageUrl());
    }

    @Test
    void 자기소개가_50자를_초과하면_400을_반환한다() throws Exception {
        String tooLong = "가".repeat(51);

        mockMvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"profileImageUrl\":null,\"biography\":\"" + tooLong + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_INPUT_VALUE.name()))
                .andExpect(jsonPath("$.errors[0].field").value("biography"));
    }

    @Test
    void 초기_능력치를_입력하면_UserStats가_생성된다() throws Exception {
        mockMvc.perform(patch("/api/users/me/initial-stats")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initialStatsBody(5, 6, 7, 8, 9, 10)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.onboarded").value(true));

        UserStats stats = userStatsRepository.findById(user.getId()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(5).compareTo(stats.getAttackScore()));
        assertEquals(0, BigDecimal.valueOf(6).compareTo(stats.getDefenseScore()));
        assertEquals(0, BigDecimal.valueOf(7).compareTo(stats.getAgilityScore()));
        assertEquals(0, BigDecimal.valueOf(8).compareTo(stats.getTeamworkScore()));
        assertEquals(0, BigDecimal.valueOf(9).compareTo(stats.getManaScore()));
        assertEquals(0, BigDecimal.valueOf(10).compareTo(stats.getHealthScore()));
        assertEquals(0, stats.getEvaluationCount());
    }

    @Test
    void 초기_능력치가_범위를_벗어나면_400을_반환한다() throws Exception {
        mockMvc.perform(patch("/api/users/me/initial-stats")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initialStatsBody(0, 6, 7, 8, 9, 10)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_INPUT_VALUE.name()));
    }

    @Test
    void 초기_능력치를_이미_설정했으면_다시_설정할_수_없다() throws Exception {
        String token = login();

        mockMvc.perform(patch("/api/users/me/initial-stats")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initialStatsBody(5, 5, 5, 5, 5, 5)))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/users/me/initial-stats")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(initialStatsBody(6, 6, 6, 6, 6, 6)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INITIAL_STATS_ALREADY_SET.name()));
    }

    @Test
    void 프로필_사진을_업로드하면_URL이_저장된다() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "profile.png", "image/png", "dummy-bytes".getBytes());
        when(storageService.uploadProfileImage(org.mockito.ArgumentMatchers.any()))
                .thenReturn("https://example.supabase.co/storage/v1/object/public/profile-images/test.png");

        mockMvc.perform(multipart("/api/users/me/profile-image")
                        .file(file)
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.profileImageUrl")
                        .value("https://example.supabase.co/storage/v1/object/public/profile-images/test.png"));

        User updated = userRepository.findByUserId(TEST_USER_ID).orElseThrow();
        assertEquals("https://example.supabase.co/storage/v1/object/public/profile-images/test.png", updated.getProfileImageUrl());
    }

    @Test
    void 토큰_없이_프로필_사진을_업로드하면_401을_반환한다() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "profile.png", "image/png", "dummy-bytes".getBytes());

        mockMvc.perform(multipart("/api/users/me/profile-image").file(file))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.UNAUTHORIZED.name()));
    }

    private String initialStatsBody(int attack, int defense, int agility, int teamwork, int mana, int health) {
        return "{\"attack\":" + attack + ",\"defense\":" + defense + ",\"agility\":" + agility
                + ",\"teamwork\":" + teamwork + ",\"mana\":" + mana + ",\"health\":" + health + "}";
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
