# 매드노바 도감 DB 설계

> 이 문서는 실제 구현된 JPA Entity(및 실제 Supabase 스키마)를 기준으로 작성된 **현재 스키마 문서**입니다.
> 과거에는 "설계 제안" 성격의 문서였으나, 제안된 변경 사항(로그인 ID 분리, CHECK 제약, 인덱스, `NUMERIC(5,2)` 전환 등)이 전부 반영 완료되어 이번에 실제 상태에 맞춰 다시 정리했습니다.
> DBMS는 PostgreSQL(Supabase, Session Pooler)을 사용합니다.

---

## 0. 개요 및 설계 원칙

- **PK는 모두 내부 대리키(`BIGINT IDENTITY`)**. 로그인 식별자(`user_id`)는 별도 UNIQUE 컬럼으로 분리하고, 관계(FK)는 항상 내부 PK(`id`)를 참조합니다.
- **DB 레벨 제약(UNIQUE/CHECK/NOT NULL)과 애플리케이션 레벨 검증(Bean Validation)을 이중화**합니다.
- **타임스탬프는 전부 `TIMESTAMPTZ`**(`Instant` 매핑)를 사용합니다.
- **`updated_at` 자동 갱신**은 JPA Auditing(`@LastModifiedDate`)으로 처리합니다(애플리케이션을 통한 쓰기만 발생한다는 전제).
- CHECK 제약은 PostgreSQL 표준 동작에 따라 **컬럼 값이 NULL이면 항상 통과**합니다.
- 스키마는 `ddl-auto: update`(Hibernate 자동 반영)로 관리하며, 별도 마이그레이션 도구(Flyway 등)는 사용하지 않습니다. 기존 row가 있는 테이블에 `NOT NULL` 컬럼을 추가할 때는 `@ColumnDefault`를 지정해 한 번에 반영되도록 합니다(지정하지 않으면 기존 row 때문에 `ALTER TABLE` 자체가 실패함 — `teams.project_deadline` 추가 시 실제로 겪은 문제).

---

## 1. users — 사용자

```sql
CREATE TABLE users (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id                  VARCHAR(50)  NOT NULL,
    password_hash            VARCHAR(255) NOT NULL,
    name                     VARCHAR(100) NOT NULL,
    profile_image_url        TEXT         NULL,
    biography                VARCHAR(50)  NULL,
    initial_attack           INTEGER      NULL,
    initial_defense          INTEGER      NULL,
    initial_agility          INTEGER      NULL,
    initial_teamwork         INTEGER      NULL,
    initial_mana             INTEGER      NULL,
    initial_health           INTEGER      NULL,
    password_changed         BOOLEAN      NOT NULL DEFAULT FALSE,
    failed_login_attempts    INTEGER      NOT NULL DEFAULT 0,
    account_locked           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_users_user_id UNIQUE (user_id),

    CONSTRAINT chk_users_initial_attack   CHECK (initial_attack   BETWEEN 1 AND 10),
    CONSTRAINT chk_users_initial_defense  CHECK (initial_defense  BETWEEN 1 AND 10),
    CONSTRAINT chk_users_initial_agility  CHECK (initial_agility  BETWEEN 1 AND 10),
    CONSTRAINT chk_users_initial_teamwork CHECK (initial_teamwork BETWEEN 1 AND 10),
    CONSTRAINT chk_users_initial_mana     CHECK (initial_mana     BETWEEN 1 AND 10),
    CONSTRAINT chk_users_initial_health   CHECK (initial_health   BETWEEN 1 AND 10)
);
```

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| id | BIGINT | NOT NULL | IDENTITY | 내부 PK |
| user_id | VARCHAR(50) | NOT NULL | - | 로그인 ID, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL | - | BCrypt 해시 |
| name | VARCHAR(100) | NOT NULL | - | 화면 표시 이름 (UNIQUE 아님, 동명이인 허용) |
| profile_image_url | TEXT | NULL | - | Supabase Storage public URL |
| biography | VARCHAR(50) | NULL | - | 한 줄 자기소개 |
| initial_attack ~ initial_health | INTEGER | NULL | - | 온보딩 전에는 NULL, 1~10 CHECK |
| password_changed | BOOLEAN | NOT NULL | FALSE | 최초 로그인 후 비밀번호 변경 여부 |
| failed_login_attempts | INTEGER | NOT NULL | 0 | 로그인 실패 연속 횟수 |
| account_locked | BOOLEAN | NOT NULL | FALSE | 5회 연속 실패 시 자동 잠금(해제는 DB 직접 수정만 가능, 별도 API 없음) |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | CURRENT_TIMESTAMP | 생성/수정 일시 |

> **알려진 한계**: `account_locked`는 로그인(`/api/auth/login`) 시점에만 검사합니다. 이미 발급된 access/refresh token은 계정이 잠긴 뒤에도 만료 전까지 유효하며, 특히 `POST /api/auth/refresh`는 `account_locked`를 전혀 검사하지 않아 잠긴 계정도 refresh token만 있으면 계속 새 토큰을 받을 수 있습니다.

---

## 2. teams — 팀

```sql
CREATE TABLE teams (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    invite_code      VARCHAR(6)   NOT NULL,
    owner_id         BIGINT       NOT NULL REFERENCES users(id),
    project_deadline TIMESTAMPTZ  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_teams_invite_code UNIQUE (invite_code)
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);
```

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| invite_code | VARCHAR(6) | NOT NULL | 6자리 영숫자, UNIQUE |
| owner_id | BIGINT | NOT NULL | FK → users.id. "팀장"이라는 별도 역할/컬럼은 없고, 이 값이 곧 팀 생성자를 의미함 |
| project_deadline | TIMESTAMPTZ | NOT NULL | **팀 생성 시 1회 입력, 이후 절대 수정하지 않는 고정값.** 이 시각이 지나야 그 팀 소속으로 합류한 멤버들이 서로 평가할 수 있음. 과거 `team_members.project_finished`(팀장이 수동으로 종료 처리)를 대체함 |

> **팀 생성/참여 정책**: `POST /api/teams/join`은 `project_deadline`이 이미 지난 팀에는 신규/재참여를 막습니다(`TEAM_DEADLINE_PASSED`). 마감기한 자체를 나중에 연장/수정하는 API는 없습니다.

---

## 3. team_members — 팀원

```sql
CREATE TABLE team_members (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id    BIGINT      NOT NULL REFERENCES teams(id),
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at    TIMESTAMPTZ NULL,

    CONSTRAINT uk_team_members_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

| 컬럼 | 설명 |
|---|---|
| (team_id, user_id) | 복합 UNIQUE — 같은 팀 중복 가입 방지. 탈퇴 후 재참여는 새 row가 아니라 기존 row의 `left_at`을 다시 NULL로 되돌리는 방식(rejoin) |
| left_at | 탈퇴 시각, NULL이면 현재 활성 멤버 |

> **변경 이력**: `project_finished` 컬럼은 삭제되었습니다. "이 팀 프로젝트가 끝났는가"는 이제 저장된 값이 아니라 `teams.project_deadline`과 현재 시각·`joined_at`을 비교해서 매번 계산합니다(`TeamMember.isEvaluationEligible()`). 팀장이 수동으로 종료 처리하는 API(`PATCH /api/teams/{id}/finish`)도 함께 제거되었습니다.

---

## 4. evaluations — 상호 평가

```sql
CREATE TABLE evaluations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id         BIGINT      NULL REFERENCES teams(id) ON DELETE SET NULL,
    evaluator_id    BIGINT      NOT NULL REFERENCES users(id),
    target_id       BIGINT      NOT NULL REFERENCES users(id),
    attack          SMALLINT    NOT NULL,
    defense         SMALLINT    NOT NULL,
    agility         SMALLINT    NOT NULL,
    teamwork        SMALLINT    NOT NULL,
    mana            SMALLINT    NOT NULL,
    health          SMALLINT    NOT NULL,
    total_score     SMALLINT    NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_evaluations_team_evaluator_target UNIQUE (team_id, evaluator_id, target_id),

    CONSTRAINT chk_evaluations_attack      CHECK (attack      BETWEEN 1 AND 10),
    CONSTRAINT chk_evaluations_defense     CHECK (defense     BETWEEN 1 AND 10),
    CONSTRAINT chk_evaluations_agility     CHECK (agility     BETWEEN 1 AND 10),
    CONSTRAINT chk_evaluations_teamwork    CHECK (teamwork    BETWEEN 1 AND 10),
    CONSTRAINT chk_evaluations_mana        CHECK (mana        BETWEEN 1 AND 10),
    CONSTRAINT chk_evaluations_health      CHECK (health      BETWEEN 1 AND 10),
    CONSTRAINT chk_evaluations_total_score CHECK (total_score BETWEEN 6 AND 60),
    CONSTRAINT chk_evaluations_no_self_review CHECK (evaluator_id <> target_id)
);

CREATE INDEX idx_evaluations_evaluator_id ON evaluations(evaluator_id);
CREATE INDEX idx_evaluations_target_id    ON evaluations(target_id);
```

| 항목 | 설명 |
|---|---|
| `team_id` | **NULLABLE + `ON DELETE SET NULL`.** 팀이 삭제되어도 평가 이력 자체는 남기고, 소속 팀 정보만 null로 만듦 |
| CHECK 6종(각 항목) | 1~10 범위 |
| `chk_evaluations_total_score` | DB 레벨 체크는 여전히 **6~60**(6항목×1~10점의 산술적 범위). 각 항목이 1~10으로 이미 제한되어 있어 이 CHECK는 사실상 항상 통과함(무의미한 제약으로 남아 있음) |
| **애플리케이션 레벨 추가 제약(DB에는 없음)** | `SubmitEvaluationRequest`/`InitialStatsRequest`에 `@AssertTrue`로 "6항목 합이 6~40"이라는 별도 검증이 있음. 단, 개별 항목이 이미 1~10으로 막혀 있어 합이 6 미만이 될 수 없으므로 **실질적으로는 "40 초과 금지"만 동작**함 |
| `chk_evaluations_no_self_review` | 자기 자신 평가 방지 |
| `(team_id, evaluator_id, target_id)` UNIQUE | **DB 레벨은 여전히 팀 단위로 중복을 판정**하지만, 애플리케이션 레벨(`EvaluationService`)은 `existsByEvaluatorIdAndTargetId`로 **팀과 무관하게 같은 대상은 평가 1회로 제한**함. 즉 같은 사람과 여러 팀을 함께해도 실제로 중복 평가는 앱 레벨에서 막히고, DB 제약은 그보다 느슨한 하위 호환용으로만 남아 있음 |

---

## 5. titles — 칭호 마스터

```sql
CREATE TABLE titles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT         NULL,
    icon        VARCHAR(255) NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_titles_name UNIQUE (name)
);
```

`TitleDataInitializer`가 앱 최초 구동 시(테이블이 비어 있을 때만) 기본 칭호 19종을 시드합니다. 이미 데이터가 있는 배포 환경에는 자동 반영되지 않으므로, 칭호를 추가할 땐 별도로 INSERT가 필요합니다.

---

## 6. title_votes — 칭호 투표 (평가 1건당 여러 칭호)

```sql
CREATE TABLE title_votes (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evaluation_id BIGINT NOT NULL REFERENCES evaluations(id),
    title_id      BIGINT NOT NULL REFERENCES titles(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_title_votes_evaluation_title UNIQUE (evaluation_id, title_id)
);

CREATE INDEX idx_title_votes_title_id ON title_votes(title_id);
```

하나의 평가(`evaluation_id`)에 서로 다른 `title_id`를 여러 개 저장해 다중 칭호 투표를 표현하고, 동일 `(evaluation_id, title_id)` 조합만 막습니다.

> **알려진 한계**: `evaluations`를 직접 삭제하면(예: 계정 삭제에 따른 수동 정리) 이 테이블도 함께 지워야 하고, 그러면 `user_title_stats`의 집계값이 자동으로 줄어들지 않습니다 — 아래 7번 참고.

---

## 7. user_title_stats — 사용자별 칭호 집계 캐시

```sql
CREATE TABLE user_title_stats (
    user_id    BIGINT  NOT NULL REFERENCES users(id),
    title_id   BIGINT  NOT NULL REFERENCES titles(id),
    vote_count INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (user_id, title_id),
    CONSTRAINT chk_user_title_stats_vote_count CHECK (vote_count >= 0)
);

CREATE INDEX idx_user_title_stats_user_vote ON user_title_stats(user_id, vote_count DESC);
```

복합 PK `(user_id, title_id)`. "대표 칭호(최다 득표) 조회"를 인덱스만으로 처리하기 위해 `(user_id, vote_count DESC)` 인덱스를 둡니다.

> **파생 데이터 주의**: 이 테이블은 `title_votes`를 집계해 누적 저장한 **캐시**이지, 실시간 계산값이 아닙니다. `title_votes`가 원본 없이 지워지면(예: 평가 삭제) 이 캐시는 자동으로 갱신되지 않으므로, 그런 작업 후에는 반드시 `title_votes` 기준으로 다시 계산해서 맞춰야 합니다. (2026-07-08 `user1` 계정 삭제 시 실제로 이 문제가 발생해 수동으로 재계산함.)

---

## 8. user_stats — 사용자별 누적(EMA) 능력치

```sql
CREATE TABLE user_stats (
    user_id                BIGINT        NOT NULL PRIMARY KEY REFERENCES users(id),
    attack_score           NUMERIC(5,2)  NOT NULL,
    defense_score          NUMERIC(5,2)  NOT NULL,
    agility_score          NUMERIC(5,2)  NOT NULL,
    teamwork_score         NUMERIC(5,2)  NOT NULL,
    mana_score             NUMERIC(5,2)  NOT NULL,
    health_score           NUMERIC(5,2)  NOT NULL,
    evaluation_count       INTEGER       NOT NULL DEFAULT 0,
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_user_stats_attack_score     CHECK (attack_score     BETWEEN 1 AND 10),
    CONSTRAINT chk_user_stats_defense_score    CHECK (defense_score    BETWEEN 1 AND 10),
    CONSTRAINT chk_user_stats_agility_score    CHECK (agility_score    BETWEEN 1 AND 10),
    CONSTRAINT chk_user_stats_teamwork_score   CHECK (teamwork_score   BETWEEN 1 AND 10),
    CONSTRAINT chk_user_stats_mana_score       CHECK (mana_score       BETWEEN 1 AND 10),
    CONSTRAINT chk_user_stats_health_score     CHECK (health_score     BETWEEN 1 AND 10),
    CONSTRAINT chk_user_stats_evaluation_count CHECK (evaluation_count >= 0)
);
```

`created_at`은 없고 `updated_at`만 있습니다(온보딩 시 `initial_*` 값으로 최초 생성, 이후 평가를 받을 때마다 EMA로 갱신).

능력치는 온보딩 시 입력한 `initial_*` 값에서 출발해, 평가를 받을 때마다 `새 점수 = 0.3 × 원점수 + 0.7 × 이전 점수` (EMA, α=0.3)로 누적 갱신됩니다. 단순 평균이 아니라서 최종 점수만 보고 방금 받은 평가의 원점수를 역산할 수 없습니다.

> **파생 데이터 주의(7번과 동일한 문제)**: 이 테이블도 `evaluations`를 집계한 캐시입니다. `evaluations`가 원본 없이 지워지면 EMA 계산 결과가 어긋난 채로 남으므로, 남은 평가만으로 초기값부터 다시 재생(replay)해서 맞춰야 합니다.

---

## 9. chat_sessions — AI 대화 세션

```sql
CREATE TABLE chat_sessions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id),
    session_title VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
```

`title`이 아니라 `session_title`(칭호 도메인의 `title`과 이름 충돌 방지)로 확정되었습니다.

---

## 10. chat_stars — 세션에 연결된 대상 참가자(별)

```sql
CREATE TABLE chat_stars (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id     BIGINT NOT NULL REFERENCES chat_sessions(id),
    target_user_id BIGINT NOT NULL REFERENCES users(id),

    CONSTRAINT uk_chat_stars_session_target UNIQUE (session_id, target_user_id)
);
```

> **이름 변경**: 예전 `chat_cards`에서 `chat_stars`로 테이블/제약 이름이 바뀌었습니다("카드 도감" 개념이 "은하 관측(별)" 컨셉으로 전면 재설계되면서 함께 변경됨). 역할은 동일합니다 — 한 세션에서 같은 대상을 중복 선택할 수 없음.

---

## 11. chat_messages — 대화 메시지

```sql
CREATE TABLE chat_messages (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT      NOT NULL REFERENCES chat_sessions(id),
    role       VARCHAR(20) NOT NULL,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_chat_messages_role CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM'))
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

---

## 12. 인덱스 설계 총괄표

| 테이블 | 인덱스 | 목적 |
|---|---|---|
| users | `uk_users_user_id`(UNIQUE) | 로그인 조회 |
| teams | `uk_teams_invite_code`(UNIQUE), `idx_teams_owner_id` | 초대 코드 조회, 내가 만든 팀 조회 |
| team_members | `uk_team_members_team_user`(UNIQUE), `idx_team_members_user_id` | 중복 가입 방지, "내가 속한 팀" 조회 |
| evaluations | `uk_evaluations_team_evaluator_target`(UNIQUE), `idx_evaluations_evaluator_id`, `idx_evaluations_target_id` | 재평가 방지(팀 단위, DB 레벨), 평가 완료 여부 판정, 수신 평가 조회 |
| titles | `uk_titles_name`(UNIQUE) | 마스터 데이터 중복 방지 |
| title_votes | `uk_title_votes_evaluation_title`(UNIQUE), `idx_title_votes_title_id` | 평가당 중복 칭호 방지, 칭호별 집계 |
| user_title_stats | PK(`user_id`,`title_id`), `idx_user_title_stats_user_vote` | 집계 캐시, 대표 칭호(최다 득표) 조회 |
| user_stats | PK(`user_id`) | 별 상세 조회 |
| chat_sessions | `idx_chat_sessions_user_id` | 내 세션 목록 조회 |
| chat_stars | `uk_chat_stars_session_target`(UNIQUE) | 세션 내 중복 대상 방지 |
| chat_messages | `idx_chat_messages_session_id` | 세션별 대화 이력 조회 |

---

## 13. 데이터 정합성 관련 알려진 한계 (2026-07-08 기준)

이번에 `user1` 테스트 계정을 실제로 삭제하면서 직접 확인한 문제들입니다. 구조를 바꾸지 않고 문서화만 해둡니다.

1. **Cascade 삭제 로직 없음**: `evaluations.team_id`(팀 삭제 시)를 제외하면, 다른 어떤 FK 관계에도 `ON DELETE CASCADE`/`SET NULL`이 없습니다. 계정을 지우려면 `title_votes → evaluations → team_members → teams(소유 시) → user_title_stats → chat_messages → chat_stars → chat_sessions → user_stats → users` 순서를 애플리케이션에서 직접 챙겨야 합니다. 회원 탈퇴 API 자체도 없습니다.
2. **파생 캐시 테이블의 정합성 보장 없음**: `user_stats`(EMA 능력치), `user_title_stats`(칭호 득표수)는 `evaluations`/`title_votes`를 누적 집계한 캐시입니다. 원본이 삭제되어도 캐시가 자동으로 갱신되지 않아, 원본을 지운 뒤에는 반드시 남은 원본 데이터로 캐시를 재계산해야 합니다.
3. **평가 수정/삭제 API 없음**: 한 번 제출한 평가를 고치거나 취소하는 방법이 없습니다(운영진 개입 시에도 DB 직접 수정 필요).

---

## 추가 개선 사항

실제 배포·운영을 염두에 두었을 때 고려해볼 만한 확장 항목입니다. **아래 항목은 제안만 하며, 실제 DB에는 추가하지 않았습니다.**

1. **프로젝트 기수(Season/Cohort) 테이블**: 현재 스키마는 몰입캠프 1개 기수만 가정합니다. `seasons` 테이블 + `teams.season_id` FK를 추가하면 여러 기수의 데이터를 함께 보관할 수 있습니다.
2. **관리자 구분**: `users.role`(`PARTICIPANT`/`ADMIN`) 컬럼 또는 별도 `admin_users` 테이블. 현재는 일반 참가자와 운영진을 구분할 방법이 없고, 평가 수정 등 관리자 기능도 없습니다.
3. **알림(Notification) 테이블**: 팀 초대, 평가 요청, 잠금 해제 등을 알리는 `notifications` 테이블.
4. ~~`team_members.project_finished`의 위치 이관~~ — **완료**. `teams.project_deadline` 기반 자동 판정으로 대체되었고, `project_finished` 컬럼 자체가 삭제되었습니다.
5. **평가 감사 로그(Audit Log)**: 운영진이 평가를 수정할 가능성이 있다면 원본 값을 보존하는 `evaluation_audit_logs` 테이블.
6. **소프트 삭제(Soft Delete) 정책 통일**: `team_members`는 `left_at`으로 소프트 삭제를 구현하지만, `chat_sessions` 등 다른 테이블에는 삭제/보관 정책이 없습니다.
7. **레이트 리미팅**: ~~DB 테이블로 뒷받침~~ — **다른 방식으로 완료**. 별도 테이블 없이 Bucket4j 인메모리 토큰 버킷으로 `POST /api/chat/sessions/{id}/messages`를 사용자당 분당 5회로 제한합니다(서버 단일 인스턴스 기준 — 다중 인스턴스로 확장 시에는 Redis 등 외부 저장소 기반으로 옮겨야 함).
8. **회원 탈퇴(계정 삭제) API 및 cascade 삭제**: 13번 항목과 연결됩니다. 현재는 계정 삭제 자체가 API로 제공되지 않고, 필요할 때마다 관련 테이블을 수동으로 순서대로 정리해야 합니다.
