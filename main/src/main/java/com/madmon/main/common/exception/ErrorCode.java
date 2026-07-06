package com.madmon.main.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

// 공통 에러 코드. 도메인별로 필요한 에러 코드가 생기면 이 enum에 항목을 추가해 확장한다.
@Getter
public enum ErrorCode {

    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "허용되지 않은 HTTP 메서드입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),

    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    PASSWORD_CHANGE_REQUIRED(HttpStatus.FORBIDDEN, "최초 로그인 시 비밀번호를 변경해야 합니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않거나 만료된 리프레시 토큰입니다."),

    INITIAL_STATS_ALREADY_SET(HttpStatus.CONFLICT, "이미 초기 능력치를 설정했습니다."),

    STORAGE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 업로드에 실패했습니다."),

    TEAM_NOT_FOUND(HttpStatus.NOT_FOUND, "팀을 찾을 수 없습니다. 초대 코드를 확인해주세요."),
    ALREADY_TEAM_MEMBER(HttpStatus.CONFLICT, "이미 참여 중인 팀입니다."),
    NOT_TEAM_MEMBER(HttpStatus.FORBIDDEN, "해당 팀의 멤버가 아닙니다."),
    NOT_TEAM_OWNER(HttpStatus.FORBIDDEN, "팀장만 수행할 수 있는 작업입니다."),

    PROJECT_NOT_FINISHED(HttpStatus.CONFLICT, "프로젝트가 아직 종료되지 않아 평가할 수 없습니다."),
    EVALUATION_ALREADY_SUBMITTED(HttpStatus.CONFLICT, "이미 이 팀원을 평가했습니다."),
    TITLE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 칭호입니다."),
    ONBOARDING_NOT_COMPLETED(HttpStatus.CONFLICT, "대상자가 아직 초기 능력치를 설정하지 않았습니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
