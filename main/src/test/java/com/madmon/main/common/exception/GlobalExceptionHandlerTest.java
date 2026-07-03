package com.madmon.main.common.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// GlobalExceptionHandler가 예외를 표준 에러 응답 포맷으로 변환하는지 검증하는 슬라이스 테스트.
// SecurityConfig는 Phase 4 이후 변경될 수 있으므로 시큐리티 필터는 검증 범위에서 제외한다.
@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestExceptionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandlerTest.TestExceptionController.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 비즈니스_예외_발생시_표준_에러_응답을_반환한다() throws Exception {
        mockMvc.perform(get("/test-exceptions/business"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.RESOURCE_NOT_FOUND.name()));
    }

    @Test
    void 유효성_검증_실패시_필드_오류_목록을_반환한다() throws Exception {
        mockMvc.perform(post("/test-exceptions/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INVALID_INPUT_VALUE.name()))
                .andExpect(jsonPath("$.errors[0].field").value("name"));
    }

    @Test
    void 예상하지_못한_예외는_공통_500_응답으로_변환된다() throws Exception {
        mockMvc.perform(get("/test-exceptions/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.INTERNAL_SERVER_ERROR.name()));
    }

    @RestController
    static class TestExceptionController {

        @GetMapping("/test-exceptions/business")
        public void throwBusinessException() {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        @PostMapping("/test-exceptions/validate")
        public void throwValidationException(@Valid @RequestBody ValidationRequest request) {
        }

        @GetMapping("/test-exceptions/unexpected")
        public void throwUnexpectedException() {
            throw new IllegalStateException("예상치 못한 오류");
        }
    }

    record ValidationRequest(@NotBlank String name) {
    }
}
