# 26s-w1-c1-03

## 공통과제 I : 웹 기반 프로젝트 (2인 1팀)

**목적:** 공통 과제를 함께 수행하며 웹 개발의 전체 흐름을 빠르게 익히고 협업에 적응하기

**결과물:** 기획부터 배포까지 완료된 웹 서비스와 관련 문서 일체

---

## 팀원

| 이름 | GitHub | 역할 |
|---|---|---|
| 권순호 | [rth934](https://github.com/rth934) | FrontEnd Dev |
| 이지민 | [ljm030206](https://github.com/ljm030206) | BackEnd Dev |
| 정서영 | [seooyy](https://github.com/seooyy) | BackEnd Dev |

---

## 기획안

> 프로젝트 주제, 목적, 핵심 기능, 예상 사용자, 팀원별 역할 등 정리

### **주제**

**매드몬 도감**
몰입캠프 참가자들을 게임 캐릭터처럼 카드로 수집하고, 팀원 간의 평가를 기반으로 능력치와 칭호를 부여하는 AI 기반 참가자 도감 서비스.


### **목적**

기존의 단순한 팀원 평가를 재미있는 게임 요소와 결합하여 참가자들이 서로의 장점과 특징을 쉽게 이해하고 공유할 수 있는 플랫폼을 제공한다. 또한 AI를 활용해 참가자들의 능력과 팀 조합을 분석하고 추천함으로써 몰입캠프 참가자 간의 상호작용과 커뮤니티 경험을 향상시키는 것을 목표로 한다.


### **핵심 기능**

* **참가자 카드 시스템**

  * 모든 참가자의 카드 조회
  * 카드 앞면: 프로필 사진, 이름, 대표 칭호, 육각형 능력치 그래프
  * 카드 뒷면: 상세 능력치, 획득 칭호, 자기소개

* **팀 기반 평가 시스템**

  * 프로젝트 종료 후 같은 팀원끼리만 평가 가능
  * 공격력, 방어력, 속도, 협업, 창의성, 문제 해결 능력 등 6개 항목 평가
  * 칭호 투표 기능 제공

* **능력치 및 칭호 산정**

  * 단순 평균이 아닌 누적 반영 알고리즘을 이용하여 능력치 계산
  * 가장 많은 표를 받은 칭호를 대표 칭호로 표시
  * 동점일 경우 모든 대표 칭호 표시

* **AI 카드 분석**

  * 특정 참가자의 특징 분석
  * 두 참가자의 능력 비교
  * 여러 참가자를 선택하여 팀 조합 및 시너지 분석
  * 카드 정보를 기반으로 자연어 질의응답 제공

* **팀 관리**

  * 팀 생성
  * 초대 코드 기반 팀 참여
  * 프로젝트 종료 후 평가 권한 관리

* **사용자 관리**

  * 로그인 및 비밀번호 변경
  * 프로필 사진 및 자기소개 설정
  * 초기 능력치 입력

### **예상 사용자**

* KAIST 몰입캠프 참가자
* 프로젝트를 함께 진행하는 팀원
* 다른 참가자의 강점과 특징을 확인하고 싶은 캠프 참가자
* AI를 활용하여 참가자 비교나 팀 조합을 분석해보고 싶은 사용자

## 기능 명세서

> 구현할 기능을 사용자 관점에서 정리하고, 필수 기능과 선택 기능을 구분

### 필수 기능

* [ ] 로그인 및 최초 로그인 시 비밀번호 변경
* [ ] 프로필 사진, 초기 능력치, 한 줄 자기소개 설정
* [ ] 팀 생성 및 초대 코드 기반 팀 참여
* [ ] 팀원 목록 조회
* [ ] 프로젝트 종료 후 팀원 상호 평가
* [ ] 6개 능력치(공격력, 방어력, Speed, 협업, 창의성, 문제 해결 능력) 평가
* [ ] 팀원 칭호 투표
* [ ] 평가 점수 및 칭호 저장
* [ ] 평가 결과를 반영한 능력치 계산(평균이 아닌 누적 반영 알고리즘)
* [ ] 대표 칭호 계산 및 표시(동점 시 공동 표시)
* [ ] 참가자 카드 도감 조회
* [ ] 카드 앞면(프로필, 이름, 대표 칭호, 육각형 그래프) 표시
* [ ] 카드 뒷면(상세 능력치, 칭호 목록, 자기소개) 표시
* [ ] 개별 카드 AI 질문
* [ ] 여러 참가자를 선택한 팀 조합 및 카드 비교 AI 분석
* [ ] AI 대화 내역 저장 및 이전 대화를 이어가는 채팅 기능


### 선택 기능

* [ ] 카드 검색 및 이름/능력치/칭호별 필터링
* [ ] 카드 정렬(이름순, 능력치순 등)
* [ ] 카드 Flip 애니메이션 및 게임 스타일 UI
* [ ] 평가 진행률 표시
* [ ] 평가 완료 시에만 카드 상세 및 AI 기능 열람 가능(잠금 기능)
* [ ] AI 질문 및 답변 기록 조회
* [ ] AI 응답 스트리밍 및 로딩 애니메이션
* [ ] AI 요청 횟수 제한(Rate Limiting)
* [ ] 프로필 사진 기본 아바타 제공
* [ ] 팀 탈퇴 및 팀 관리 기능
* [ ] 대표 칭호 및 능력치 캐싱을 통한 조회 성능 향상
* [ ] 관리자 기능(평가 수정, 사용자 관리 등)
* [ ] 사용자 활동 통계 및 랭킹
* [ ] 모바일 반응형 UI 지원


---

## IA 및 화면 설계서

> 서비스의 전체 페이지 구조와 페이지 간 이동 흐름; 각 페이지의 주요 UI 구성, 입력 요소, 버튼, 사용자 행동 흐름 등을 간단한 와이어프레임 형태로 정리

<!-- Figma 링크 또는 이미지 첨부 -->
![Wireframe Overview](./wireframe_overview.png)

자세한 와이어프레임은 아래 Figma 링크에서 확인할 수 있습니다.

[Figma Wireframe 보기](https://www.figma.com/design/WMpfUenDYD9xxfdElZkIfv/%EB%A7%A4%EB%93%9C%EB%AA%AC-%EB%8F%84%EA%B0%90-%EC%99%80%EC%9D%B4%EC%96%B4%ED%94%84%EB%A0%88%EC%9E%84?node-id=0-1&t=XtlvI7OwAqt8XBG2-1)

---

## DB 스키마

> 필요한 테이블, 주요 필드, 데이터 타입, 테이블 간 관계를 정리

<!-- ERD 이미지 또는 테이블 정의 -->
![DB_Schema](./DB_Schema.png)

---

## API 문서

> API 주소, 요청 방식, 요청값, 응답값, 에러 상황을 정리

| Method | Endpoint | 설명 | 요청 | 응답 |
|---|---|---|---|---|
| POST | `/api/auth/login` | 로그인, access/refresh 토큰 발급 | `{userId, password}` | `{accessToken, refreshToken, passwordChanged}` |
| POST | `/api/auth/refresh` | refresh token으로 access/refresh 토큰 재발급(공개 경로) | `{refreshToken}` | `{accessToken, refreshToken, passwordChanged}` |
| PATCH | `/api/auth/password` | 비밀번호 변경(인증 필요). 성공 시 갱신된 `passwordChanged` 상태를 담은 새 토큰 쌍을 즉시 반환한다 | `{currentPassword, newPassword}` | `{accessToken, refreshToken, passwordChanged}` |

---

## 배포 결과물

> 접속 가능한 링크, 실행 방법, 주요 구현 내용

- **서비스 URL:**
- **실행 방법:**

```bash
cd main
cp .env.example .env
# .env에 Supabase Dashboard > Connect > Session pooler 값을 입력합니다.
set -a
source .env
set +a
bash gradlew bootRun
```

DB 연결은 Supabase Shared Pooler의 **Session mode**를 사용합니다. Session
Pooler는 포트 `5432`, 사용자명 `postgres.<project-ref>` 형식이며, 연결
정보는 저장소에 커밋하지 않습니다.

---

## 회고 문서

> 개발 과정에서의 어려움, 해결 방법, 역할 분담, 다음에 개선할 점 (KPT 방법론 참고)

### Keep

### Problem

### Try

---

## 참고 자료

- [SDD(스펙 주도 개발) 이해하기](https://news.hada.io/topic?id=21338)
- [Software Design Document Best Practices](https://www.atlassian.com/work-management/project-management/design-document)
- [IA 정보구조도 작성 방법](https://brunch.co.kr/@nyonyo/7)
- [기획자 화면설계서 작성법](https://brunch.co.kr/@soup/10)
- [Figma 와이어프레임 가이드](https://www.figma.com/ko-kr/resource-library/what-is-wireframing/)
- [무료 Figma 와이어프레임 키트](https://www.figma.com/ko-kr/templates/wireframe-kits/)
- [ERD/DB 설계 총정리](https://inpa.tistory.com/entry/DB-%F0%9F%93%9A-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%AA%A8%EB%8D%B8%EB%A7%81-%EA%B0%9C%EB%85%90-ERD-%EB%8B%A4%EC%9D%B4%EC%96%B4%EA%B7%B8%EB%9E%A8)
- [API 명세서 작성 가이드라인](https://velog.io/@sebinChu/BackEnd-API-%EB%AA%85%EC%84%B8%EC%84%9C-%EC%9E%91%EC%84%B1-%EA%B0%80%EC%9D%B4%EB%93%9C-%EB%9D%BC%EC%9D%B8)
- [좋은 README 작성하는 방법](https://velog.io/@sabo/good-readme)
- [단기 프로젝트 회고 KPT 방법론](https://velog.io/@habwa/%EB%8B%A8%EA%B8%B0-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%ED%9A%8C%EA%B3%A0-KPT-%EB%B0%A9%EB%B2%95%EB%A1%A0)
