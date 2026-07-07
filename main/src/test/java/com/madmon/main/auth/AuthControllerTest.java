package com.madmon.main.auth;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.user.entity.User;
import com.madmon.main.user.repository.UserRepository;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(properties = "spring.profiles.active=test")
@AutoConfigureMockMvc
@Import(AuthControllerTest.ProtectedTestController.class)
@Transactional
class AuthControllerTest {

    private static final String TEST_USER_ID = "2026100";
    private static final String RAW_PASSWORD = "initial-password";
    private static final Pattern ACCESS_TOKEN_PATTERN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");
    private static final Pattern REFRESH_TOKEN_PATTERN = Pattern.compile("\"refreshToken\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        User user = User.create(
                TEST_USER_ID, passwordEncoder.encode(RAW_PASSWORD), "테스트유저",
                null, null, null, null, null, null, null, null, false
        );
        userRepository.save(user);
    }

    @Test
    void 로그인_성공시_토큰을_발급한다() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(RAW_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.passwordChanged").value(false));
    }

    @Test
    void 잘못된_비밀번호로_로그인하면_401을_반환한다() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_CREDENTIALS.name()));
    }

    @Test
    void 비밀번호를_5번_틀리면_계정이_잠긴다() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginBody("wrong-password")))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_CREDENTIALS.name()));
        }

        // 계정이 잠긴 뒤에는 올바른 비밀번호를 넣어도 거부되어야 한다.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(RAW_PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.ACCOUNT_LOCKED.name()));
    }

    @Test
    void 로그인에_성공하면_실패_횟수가_초기화된다() throws Exception {
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody("wrong-password")));
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(RAW_PASSWORD)))
                .andExpect(status().isOk());

        // 성공으로 실패 횟수가 리셋됐으니, 다시 4번 틀려도 아직 잠기지 않아야 한다.
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody("wrong-password")));
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(RAW_PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void 토큰_없이_보호된_API에_접근하면_401을_반환한다() throws Exception {
        mockMvc.perform(get("/api/some-protected-resource"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.UNAUTHORIZED.name()));
    }

    @Test
    void 최초_로그인_사용자는_비밀번호_변경_전까지_다른_API가_차단된다() throws Exception {
        String[] tokens = login(RAW_PASSWORD);

        mockMvc.perform(get("/api/some-protected-resource")
                        .header("Authorization", "Bearer " + tokens[0]))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PASSWORD_CHANGE_REQUIRED.name()));
    }

    @Test
    void 리프레시_토큰으로는_보호된_API에_접근할_수_없다() throws Exception {
        String[] tokens = login(RAW_PASSWORD);

        // refreshToken은 access token과 클레임 구조는 같지만 tokenType이 달라, 그대로 Bearer로 사용해도
        // 인증 필터가 인증 주체를 세팅하지 않고 그대로 통과시켜 401(미인증)로 이어져야 한다.
        mockMvc.perform(get("/api/some-protected-resource")
                        .header("Authorization", "Bearer " + tokens[1]))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.UNAUTHORIZED.name()));
    }

    @Test
    void 리프레시_토큰으로_새로운_토큰_쌍을_발급받는다() throws Exception {
        String[] tokens = login(RAW_PASSWORD);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + tokens[1] + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    void access_토큰으로_재발급을_요청하면_거부된다() throws Exception {
        String[] tokens = login(RAW_PASSWORD);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + tokens[0] + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_REFRESH_TOKEN.name()));
    }

    @Test
    void 비밀번호_변경에_성공하면_새_토큰이_즉시_발급되고_잠금이_풀린다() throws Exception {
        String[] tokens = login(RAW_PASSWORD);

        MvcResult result = mockMvc.perform(patch("/api/auth/password")
                        .header("Authorization", "Bearer " + tokens[0])
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + RAW_PASSWORD + "\",\"newPassword\":\"new-password-123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.passwordChanged").value(true))
                .andReturn();

        assertTrue(userRepository.findByUserId(TEST_USER_ID).orElseThrow().isPasswordChanged());

        String newAccessToken = extract(ACCESS_TOKEN_PATTERN, result.getResponse().getContentAsString());
        assertNotEquals(tokens[0], newAccessToken);

        // 옛 토큰(passwordChanged=false 클레임)은 여전히 차단되고, 새로 발급된 토큰은 잠금이 풀려있어야 한다.
        mockMvc.perform(get("/api/some-protected-resource")
                        .header("Authorization", "Bearer " + tokens[0]))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PASSWORD_CHANGE_REQUIRED.name()));

        mockMvc.perform(get("/api/some-protected-resource")
                        .header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isOk());
    }

    @Test
    void 인증이_필요한_경로의_CORS_preflight_요청은_인증_없이도_통과된다() throws Exception {
        // 브라우저가 PATCH/DELETE 등을 보내기 전에 먼저 보내는 preflight(OPTIONS)에는
        // Authorization 헤더가 실리지 않는다. anyRequest().authenticated()에 걸려 401이 나면
        // 실제 요청이 나가보지도 못하고 브라우저에서 CORS 오류로 막힌다.
        mockMvc.perform(options("/api/auth/password")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    private String[] login(String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(password)))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        return new String[] {extract(ACCESS_TOKEN_PATTERN, body), extract(REFRESH_TOKEN_PATTERN, body)};
    }

    private String extract(Pattern pattern, String body) {
        Matcher matcher = pattern.matcher(body);
        if (!matcher.find()) {
            throw new IllegalStateException("응답에서 토큰을 찾을 수 없습니다: " + body);
        }
        return matcher.group(1);
    }

    private String loginBody(String password) {
        return "{\"userId\":\"" + TEST_USER_ID + "\",\"password\":\"" + password + "\"}";
    }

    // 인증 필터/게이팅만 검증하기 위한 임의의 보호된 엔드포인트.
    // 매핑이 없는 경로를 쓰면 GlobalExceptionHandler의 catch-all이 Spring의
    // NoResourceFoundException(404)까지 500으로 바꿔버려 상태 코드로 필터 동작을 구분할 수 없다.
    @RestController
    static class ProtectedTestController {

        @GetMapping("/api/some-protected-resource")
        public String protectedResource() {
            return "ok";
        }
    }
}
