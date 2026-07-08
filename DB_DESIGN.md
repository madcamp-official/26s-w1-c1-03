# 매드노바 도감 DB 설계 (개선판)

> 이 문서는 `DB_Schema.png`(초기 ERD)와 현재 구현된 JPA Entity를 기준으로, 실제 서비스 운영 관점에서 스키마를 재검토하고 개선한 결과입니다.
> **이 문서는 설계 제안입니다.** 코드/Entity/Repository는 이 문서에 맞춰 수정되지 않았으며, 반영은 별도 Phase 승인 후 진행합니다.
> DBMS는 PostgreSQL(Supabase)을 기준으로 작성했습니다.

---

## 0. 개요 및 설계 원칙

- **PK는 모두 내부 대리키(`BIGINT IDENTITY`)를 유지**합니다. 로그인 식별자(`user_id`)처럼 사용자가 다루는 값은 별도의 UNIQUE 컬럼으로 분리하고, 관계(FK)는 항상 내부 PK(`id`)를 참조합니다.
- **DB 레벨 제약(UNIQUE/CHECK/NOT NULL)과 애플리케이션 레벨 검증(Bean Validation)을 이중화**합니다. 데이터 정합성이 중요한 항목(평가 중복, 점수 범위 등)은 DB가 최후 방어선 역할을 하도록 합니다.
- **타임스탬프는 `TIMESTAMPTZ`(시간대 포함) 사용을 권장**합니다. Supabase/PostgreSQL 공식 권장 사항이며, 서버·클라이언트 시간대가 다를 때 발생하는 버그를 원천 차단합니다. (`common.entity.BaseEntity`는 이미 `Instant` 기준으로 매핑되어 있어 별도 전환 작업 없이 `TIMESTAMPTZ`와 그대로 대응됩니다.)
- **`updated_at` 자동 갱신**은 두 가지 방식이 있습니다.
  1. 애플리케이션 레벨: JPA Auditing(`@LastModifiedDate`) — 현재 이미 구현되어 있고, 모든 쓰기가 애플리케이션을 통해서만 발생하는 한 충분합니다.
  2. DB 레벨: PostgreSQL 트리거 함수 — Supabase 콘솔이나 외부 도구로 직접 UPDATE하는 경우까지 대비하는 방어선입니다.
  이 문서는 두 방식을 모두 명시하되, **기본은 방식 1(현재 구현과 동일)** 로 하고 방식 2는 선택 적용 항목으로 안내합니다.
- CHECK 제약은 PostgreSQL 표준 동작에 따라 **컬럼 값이 NULL이면 항상 통과**합니다(`CHECK (col BETWEEN 1 AND 10)`은 `col`이 NULL이어도 위반으로 처리되지 않음). 따라서 "선택 값 + 범위 제한"이 동시에 필요한 컬럼도 별도의 `OR IS NULL` 없이 간결하게 표현했습니다.

---

## 1. users — 사용자

### 설계 변경 핵심
- 로그인 식별자를 `name`이 아니라 **`user_id`(학번/운영진 발급 ID)** 로 분리합니다. `name`은 화면에 보여지는 표시 이름 역할만 하므로 더 이상 UNIQUE일 필요가 없습니다(동명이인 허용).
- `profile_image` → **`profile_image_url`** 로 이름을 변경해 "URL 문자열을 저장한다"는 의미를 명확히 합니다.
- 초기 능력치(`initial_*`)와 `profile_image_url`/`biography`는 **온보딩 이전에는 값이 없을 수 있으므로 NULLABLE** 로 유지합니다. (운영진이 계정을 만드는 시점에는 `user_id`/`password_hash`/`name`만 존재하고, 최초 로그인 후 온보딩 단계에서 나머지가 채워지는 흐름을 그대로 반영)

```sql
CREATE TABLE users (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id                  VARCHAR(50)  NOT NULL,
    password_hash            VARCHAR(255) NOT NULL,
    name                     VARCHAR(100) NOT NULL,
    profile_image_url        TEXT         NULL,
    biography                VARCHAR(50)  NULL,
    initial_attack           SMALLINT     NULL,
    initial_defense          SMALLINT     NULL,
    initial_agility          SMALLINT     NULL,
    initial_teamwork         SMALLINT     NULL,
    initial_mana             SMALLINT     NULL,
    initial_health           SMALLINT     NULL,
    password_changed         BOOLEAN      NOT NULL DEFAULT FALSE,
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

-- UNIQUE 제약은 PostgreSQL에서 자동으로 동일한 이름의 인덱스를 생성하므로 별도 인덱스 불필요
```

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| id | BIGINT | NOT NULL | IDENTITY | 내부 PK (변경 없음) |
| user_id | VARCHAR(50) | NOT NULL | - | **로그인 ID** (학번 등 운영진 발급 값), UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL | - | BCrypt 해시 |
| name | VARCHAR(100) | NOT NULL | - | 화면 표시 이름 (더 이상 UNIQUE 아님) |
| profile_image_url | TEXT | NULL | - | Supabase Storage public URL (구 `profile_image`) |
| biography | VARCHAR(50) | NULL | - | 한 줄 자기소개, 50자 제한 |
| initial_attack ~ initial_health | SMALLINT | NULL | - | 온보딩 전에는 NULL, 1~10 CHECK |
| password_changed | BOOLEAN | NOT NULL | FALSE | 최초 로그인 여부 플래그 |
| created_at | TIMESTAMPTZ | NOT NULL | CURRENT_TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMPTZ | NOT NULL | CURRENT_TIMESTAMP | 수정일시(자동 갱신) |

---

## 2. teams — 팀

```sql
CREATE TABLE teams (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10)  NOT NULL,
    owner_id    BIGINT       NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_teams_invite_code UNIQUE (invite_code)
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);
```

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| invite_code | VARCHAR(10) | NOT NULL | - | 6자리 영숫자(비즈니스 규칙은 앱에서 검증), 길이에 여유를 둠. UNIQUE |
| owner_id | BIGINT | NOT NULL | - | FK → users.id, 인덱스로 "내가 만든 팀" 조회 최적화 |

---

## 3. team_members — 팀원

```sql
CREATE TABLE team_members (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id          BIGINT      NOT NULL REFERENCES teams(id),
    user_id          BIGINT      NOT NULL REFERENCES users(id),
    joined_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at          TIMESTAMPTZ NULL,
    project_finished BOOLEAN     NOT NULL DEFAULT FALSE,

    CONSTRAINT uk_team_members_team_user UNIQUE (team_id, user_id)
);

-- (team_id, user_id) 복합 UNIQUE 인덱스가 team_id 단독 조회도 커버하므로 별도 team_id 인덱스는 불필요
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

| 컬럼 | 설명 |
|---|---|
| (team_id, user_id) | 복합 UNIQUE — 같은 팀 중복 가입 방지 |
| left_at | 탈퇴 시각, NULL이면 현재 활성 멤버 |
| user_id 단독 인덱스 | "내가 속한 팀 목록" 조회(`user_id`로 필터링)가 자주 발생하므로 추가 |

> **검토 의견(구조 변경은 하지 않고 참고용으로만 남김)**: `project_finished`는 의미상 "이 팀의 프로젝트가 끝났는가"이므로 팀원 개개인이 아니라 **팀 전체에 귀속된 속성**입니다. 현재처럼 `team_members`에 두면 팀원 수만큼 같은 값을 중복 저장하고, 갱신 시 모든 멤버 행을 함께 업데이트해야 하는 부담이 있습니다. 구조를 크게 바꾸지 않기로 한 이번 개선 범위에서는 유지하되, §"추가 개선 사항"에 이관 제안을 남겨둡니다.

---

## 4. evaluations — 상호 평가

```sql
CREATE TABLE evaluations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id         BIGINT      NOT NULL REFERENCES teams(id),
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
| CHECK 6종(각 항목) | 1~10 범위, 요청사항 반영 |
| `chk_evaluations_total_score` | 6항목 합계이므로 **6~60** 범위로 확정(BACKEND_DEVELOPMENT_PLAN.md §13에서 열어두었던 "40점 vs 6~60점" 불일치를 6~60으로 확정) |
| `chk_evaluations_no_self_review` | **자기 자신 평가 방지** — 기존에 명시되지 않았던 정합성 규칙을 추가 제안 |
| `(team_id, evaluator_id, target_id)` UNIQUE | 같은 프로젝트에서 같은 대상 재평가 방지 (기존 Entity에 이미 존재 — 유지) |
| `idx_evaluations_evaluator_id` / `idx_evaluations_target_id` | "내가 평가를 다 했는지"(evaluator 기준), "이 사람이 받은 평가 조회"(target 기준) 각각 빈번한 조회이므로 개별 인덱스 필요(복합 UNIQUE의 왼쪽 접두사인 team_id만으로는 evaluator_id/target_id 단독 조회를 커버하지 못함) |

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

변경 없음(요청사항 그대로 `name UNIQUE` 유지). `description`/`icon`은 운영 초기 데이터 등록 편의를 위해 NULL 허용 유지.

---

## 6. title_votes — 칭호 투표 (평가 1건당 여러 칭호)

```sql
CREATE TABLE title_votes (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evaluation_id BIGINT NOT NULL REFERENCES evaluations(id),
    title_id      BIGINT NOT NULL REFERENCES titles(id),

    CONSTRAINT uk_title_votes_evaluation_title UNIQUE (evaluation_id, title_id)
);

CREATE INDEX idx_title_votes_title_id ON title_votes(title_id);
```

> **참고**: 요청하신 "Evaluation 1 : N TitleVote + 같은 평가에서 같은 칭호 중복 선택 금지"는 **현재 Entity(`TitleVote`)에 이미 이 구조(`evaluation_id`+`title_id`, 복합 UNIQUE)로 구현되어 있습니다.** 하나의 `evaluation_id`에 서로 다른 `title_id`를 가진 행을 여러 개 저장하면 "버그 헌터 + 코드 마법사 + 최고의 팀플러"처럼 다중 칭호 선택이 정상적으로 가능하고, 동일 `(evaluation_id, title_id)` 조합만 막습니다. 이 문서에서는 구조를 그대로 확인·명문화했고, `idx_title_votes_title_id`(칭호별 전체 집계용) 인덱스만 추가로 제안합니다.

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

-- 대표 칭호(최다 득표) 조회 시 "user_id로 필터 + vote_count 내림차순 정렬"이 핵심 패턴
CREATE INDEX idx_user_title_stats_user_vote ON user_title_stats(user_id, vote_count DESC);
```

복합 PK(`user_id, title_id`)는 요청대로 유지합니다. 추가된 `idx_user_title_stats_user_vote`는 "이 사용자의 대표 칭호(최다 득표) 조회" 쿼리(`ORDER BY vote_count DESC`)를 인덱스만으로 처리하도록 돕습니다.

---

## 8. user_stats — 사용자별 누적(난독화) 능력치

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

### FLOAT → NUMERIC(5,2) 검토 결과: **변경을 권장합니다.**

| 항목 | FLOAT(현재) | NUMERIC(5,2)(제안) |
|---|---|---|
| 정확도 | 이진 부동소수점 — 반복적인 EMA 누적 갱신 시 미세한 반올림 오차 누적 가능 | 10진 고정소수점 — 항상 정확한 값 저장, 반올림 오차 없음 |
| 표시 일관성 | `7.6999999...`처럼 표시될 수 있어 프론트에서 매번 반올림 로직 필요 | 항상 소수점 둘째 자리까지 정확히 저장되어 표시가 일관됨 |
| 값의 범위 | 사실상 1~10 사이의 값만 나옴(EMA는 입력값의 가중평균이므로 입력 범위를 벗어나지 않음) | `NUMERIC(5,2)`는 최대 999.99까지 표현 가능해 범위상 전혀 부족하지 않음 |
| 성능 | 근소하게 빠름 | 근소하게 느리지만, 이 테이블은 사용자당 1행뿐이라 성능 차이가 무의미 |

카드 도감의 육각형 그래프 수치처럼 **사용자에게 그대로 노출되는 값**은 부동소수점 오차가 없는 편이 안전하므로 `NUMERIC(5,2)`로 변경할 것을 제안합니다.

---

## 9. chat_sessions — AI 대화 세션

```sql
CREATE TABLE chat_sessions (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id),
    session_title VARCHAR(100) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
```

> **컬럼명 제안**: `title` → **`session_title`**. 이 스키마에는 이미 "칭호"를 뜻하는 `titles`/`title_votes`/`user_title_stats`가 있어 `title`이라는 단어가 도메인상 두 가지 의미(칭호 vs 대화 제목)로 겹칩니다. 큰 구조 변경 없이 이름만 바꾸는 선에서 혼동을 줄일 수 있어 제안합니다(필수 아님).

---

## 10. chat_cards — 세션에 연결된 대상 카드

```sql
CREATE TABLE chat_cards (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id     BIGINT NOT NULL REFERENCES chat_sessions(id),
    target_user_id BIGINT NOT NULL REFERENCES users(id),

    CONSTRAINT uk_chat_cards_session_target UNIQUE (session_id, target_user_id)
);

-- (session_id, target_user_id) 복합 UNIQUE 인덱스가 session_id 단독 조회도 커버
```

> **참고**: 요청하신 `(session_id, target_user_id)` 복합 UNIQUE는 **현재 Entity에 이미 구현되어 있습니다.** 한 세션에서 같은 대상을 중복 선택할 수 없다는 요구사항을 그대로 만족합니다.

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

`idx_chat_messages_session_id`는 대화 이력 조회(`session_id`로 필터 + `created_at` 정렬)에서 가장 빈번하게 사용되는 인덱스입니다.

---

## 12. 인덱스 설계 총괄표

| 테이블 | 인덱스 | 목적 |
|---|---|---|
| users | `uk_users_user_id`(UNIQUE) | 로그인 조회(`user_id`로 계정 탐색) |
| teams | `uk_teams_invite_code`(UNIQUE), `idx_teams_owner_id` | 초대 코드 조회, 내가 만든 팀 조회 |
| team_members | `uk_team_members_team_user`(UNIQUE), `idx_team_members_user_id` | 중복 가입 방지, "내가 속한 팀" 조회 |
| evaluations | `uk_evaluations_team_evaluator_target`(UNIQUE), `idx_evaluations_evaluator_id`, `idx_evaluations_target_id` | 재평가 방지, 평가 완료 여부 판정, 카드 상세용 수신 평가 조회 |
| titles | `uk_titles_name`(UNIQUE) | 마스터 데이터 중복 방지 |
| title_votes | `uk_title_votes_evaluation_title`(UNIQUE), `idx_title_votes_title_id` | 평가당 중복 칭호 방지, 칭호별 집계 |
| user_title_stats | PK(`user_id`,`title_id`), `idx_user_title_stats_user_vote` | 집계 캐시, 대표 칭호(최다 득표) 조회 |
| user_stats | PK(`user_id`) | 카드 도감 조회 |
| chat_sessions | `idx_chat_sessions_user_id` | 내 세션 목록 조회 |
| chat_cards | `uk_chat_cards_session_target`(UNIQUE) | 세션 내 중복 카드 방지 |
| chat_messages | `idx_chat_messages_session_id` | 세션별 대화 이력 조회 |

---

## 변경 사항

| 구분 | 변경 내용 | 변경 이유 | 기대 효과 |
|---|---|---|---|
| 로그인 방식 | `users`에 `user_id`(로그인 ID, UNIQUE) 컬럼 신설. `name`은 UNIQUE 해제, 표시용 이름으로 역할 변경 | 요청사항 반영 — 로그인은 이메일이 아닌 학번/운영진 발급 ID 기준으로 진행 | 동명이인 참가자를 허용하면서도 로그인 식별자는 명확히 분리됨 |
| 칭호 다중 선택 | 변경 없음(이미 `Evaluation 1:N TitleVote` + `(evaluation_id,title_id)` UNIQUE 구조) | 기존 Entity가 이미 요구사항을 만족함을 확인 | 문서와 실제 구조 간 불일치를 해소, 향후 혼동 방지 |
| `profile_image` → `profile_image_url` | 컬럼명 변경 | URL 문자열을 저장한다는 의미를 명확히 함 | API/DTO 설계 시 컬럼 용도 오인 방지 |
| CHECK 제약 추가 | `evaluations`, `users.initial_*`, `user_stats` 점수 컬럼에 1~10(또는 6~60) 범위 CHECK 추가, 자기 자신 평가 금지(`evaluator_id <> target_id`) 추가 | 애플리케이션 검증만으로는 우회 경로(배치 스크립트, 관리자 콘솔 등)에서 잘못된 값이 들어갈 수 있음 | DB가 최후 방어선 역할을 하여 데이터 정합성 강화 |
| `total_score` 범위 확정 | 6~60으로 확정 | BACKEND_DEVELOPMENT_PLAN.md §13에서 열어두었던 "40점 vs 6~60점" 불일치를 산술적으로 맞는 값(6항목×1~10점)으로 확정 | 검증 로직 구현 시 모호함 제거 |
| `user_stats` 타입 변경 | `FLOAT` → `NUMERIC(5,2)` | 부동소수점 반올림 오차 없이 정확한 값 저장/표시 필요 | 카드 도감 수치 표시의 일관성 확보 |
| Nullable 재검토 | `users.profile_image_url`, `biography`, `initial_*` 6종을 NULLABLE로 유지(온보딩 이전 상태 반영). 그 외 필수 값은 전부 NOT NULL로 재확인 | 계정 생성 시점과 온보딩 완료 시점이 분리되어 있는 실제 흐름 반영 | 불필요한 더미값 삽입 없이 "온보딩 미완료" 상태를 자연스럽게 표현 |
| 인덱스 추가 | `evaluations.evaluator_id`/`target_id`, `team_members.user_id`, `chat_messages.session_id`, `chat_sessions.user_id`, `title_votes.title_id`, `user_title_stats(user_id, vote_count DESC)`, `teams.owner_id` | 조회 빈도가 높은 FK/정렬 컬럼에 인덱스가 없으면 테이블이 커질수록 전체 스캔 위험 | 카드 도감·평가 게이팅·대화 이력 조회 등 자주 실행되는 쿼리의 성능 확보 |
| 타임스탬프 타입 권장 | `TIMESTAMP` → `TIMESTAMPTZ` 권장 | Supabase/PostgreSQL 공식 권장사항, 시간대 버그 예방 | 서버-클라이언트 시간대가 달라도 일관된 시각 처리 |
| 컬럼명 제안(선택) | `chat_sessions.title` → `session_title` 제안 | 칭호(Title) 도메인과 이름이 겹쳐 혼동 가능 | 스키마 가독성 향상(강제 아님) |

---

## 추가 개선 사항

실제 배포·운영을 염두에 두었을 때 고려해볼 만한 확장 항목입니다. **아래 항목은 제안만 하며, 실제 DB에는 추가하지 않았습니다.**

1. **프로젝트 기수(Season/Cohort) 테이블**: 현재 스키마는 몰입캠프 1개 기수만 가정합니다. `seasons`(id, name, start_date, end_date) 테이블을 추가하고 `teams.season_id` FK를 연결하면, 매 기수마다 데이터를 초기화하지 않고도 여러 기수의 팀/평가/카드 기록을 함께 보관하고 "지난 기수 도감 보기" 같은 기능도 가능해집니다.
2. **관리자 구분**: 기능명세서의 "관리자 기능(평가 수정, 사용자 관리)"을 대비해 `users.role`(예: `PARTICIPANT` / `ADMIN`) 컬럼 또는 별도 `admin_users` 테이블을 제안합니다. 현재는 일반 참가자와 운영진을 구분할 방법이 없습니다.
3. **알림(Notification) 테이블**: 팀 초대 성공, 평가 요청 도착, AI 분석 완료 등을 알리기 위한 `notifications`(id, user_id, type, message, is_read, created_at) 테이블을 제안합니다. 선택 기능이었던 "평가 진행률 표시"나 "잠금 해제 알림"과도 자연스럽게 연결됩니다.
4. **`team_members.project_finished`의 위치 이관**: 위 3번 섹션에서 언급했듯, 이 값은 개념적으로 팀 단위 속성이므로 `teams.is_project_finished` 컬럼으로 옮기는 것을 고려해볼 수 있습니다. 다만 카드 잠금(gating) 로직이 이미 team_members 기준으로 설계 문서화되어 있어, 실제로 옮기려면 관련 쿼리/서비스 로직도 함께 조정해야 하므로 별도 논의가 필요합니다.
5. **평가 감사 로그(Audit Log)**: "평가는 제출 후 수정 불가"가 원칙이지만 운영진이 예외적으로 수정할 가능성이 있다면(§선택 기능), 원본 값을 보존하는 `evaluation_audit_logs` 테이블을 별도로 두어 수정 이력을 남기는 편이 안전합니다.
6. **소프트 삭제(Soft Delete) 정책 통일**: `team_members`는 이미 `left_at`으로 소프트 삭제를 구현하고 있는데, 다른 테이블(예: `chat_sessions`)에는 삭제/보관 정책이 없습니다. 대화 세션 삭제 기능이 추후 필요하다면 `deleted_at` 컬럼 도입을 고려할 수 있습니다.
7. **레이트 리미팅 근거 테이블**: 기능명세서의 "AI 요청 횟수 제한(선택 기능)"을 DB 레벨에서 뒷받침하려면 `chat_messages`에 이미 있는 `created_at` + `chat_sessions.user_id` 인덱스만으로도 "최근 N분간 요청 수"를 조회할 수 있지만, 트래픽이 커지면 카운터를 캐싱하는 별도 테이블(또는 Redis 같은 인메모리 스토어)이 더 적합합니다.
