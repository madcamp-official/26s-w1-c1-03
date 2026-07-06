// 백엔드(main/) API 클라이언트. BACKEND_DEVELOPMENT_PLAN.md §7, 실제 auth/user 컨트롤러 기준.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://api.madmon.madcamp-kaist.org/api";

const ACCESS_TOKEN_KEY = "madmon_access_token";
const REFRESH_TOKEN_KEY = "madmon_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  errorCode: string;
  status: number;
  constructor(errorCode: string, message: string, status: number) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  { auth = true, retry = true }: { auth?: boolean; retry?: boolean } = {}
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("NETWORK_ERROR", "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", 0);
  }

  const body: ApiEnvelope<T> = await res
    .json()
    .catch(() => ({ success: false, errorCode: "NETWORK_ERROR", message: "서버 응답을 처리할 수 없습니다." }));

  if (res.ok && body.success) return body.data as T;

  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, { auth, retry: false });
  }

  throw new ApiError(body.errorCode ?? "UNKNOWN_ERROR", body.message ?? "요청 처리 중 오류가 발생했습니다.", res.status);
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const body: ApiEnvelope<LoginResponseDto> = await res.json();
    if (res.ok && body.success && body.data) {
      setTokens(body.data.accessToken, body.data.refreshToken);
      return true;
    }
  } catch {
    // 네트워크 오류 등 — 아래에서 토큰을 정리하고 실패 처리
  }
  clearTokens();
  return false;
}

// ─── DTO 타입 (백엔드 record와 1:1 매칭) ──────────────────────────────────────

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  passwordChanged: boolean;
}

export interface UserStatsDto {
  attack: number;
  defense: number;
  speed: number;
  teamwork: number;
  creativity: number;
  problemSolving: number;
  evaluationCount: number;
}

export interface UserProfileDto {
  id: number;
  userId: string;
  name: string;
  profileImageUrl: string | null;
  biography: string | null;
  passwordChanged: boolean;
  onboarded: boolean;
  stats: UserStatsDto | null;
}

export interface InitialStatsInput {
  attack: number;
  defense: number;
  speed: number;
  teamwork: number;
  creativity: number;
  problemSolving: number;
}

// ─── API 함수 ─────────────────────────────────────────────────────────────────

export async function login(userId: string, password: string): Promise<LoginResponseDto> {
  const data = await request<LoginResponseDto>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ userId, password }) },
    { auth: false }
  );
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<LoginResponseDto> {
  const data = await request<LoginResponseDto>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export function getMyProfile(): Promise<UserProfileDto> {
  return request<UserProfileDto>("/users/me", { method: "GET" });
}

export function updateProfile(input: { profileImageUrl?: string | null; biography?: string | null }): Promise<UserProfileDto> {
  return request<UserProfileDto>("/users/me", { method: "PATCH", body: JSON.stringify(input) });
}

export function setInitialStats(input: InitialStatsInput): Promise<UserProfileDto> {
  return request<UserProfileDto>("/users/me/initial-stats", { method: "PATCH", body: JSON.stringify(input) });
}

export function uploadProfileImage(file: File): Promise<UserProfileDto> {
  const form = new FormData();
  form.append("file", file);
  return request<UserProfileDto>("/users/me/profile-image", { method: "POST", body: form });
}

// ─────────────────────────────────────────────────────────────────────────────
// 아래는 BACKEND_DEVELOPMENT_PLAN.md Phase 7~10(팀/평가/칭호/카드/AI 채팅)에
// 대한 설계입니다. 이 도메인들은 아직 백엔드에 컨트롤러가 구현되어 있지 않아
// (2026-07-06 기준) 실제 경로/응답 형식은 추측입니다. 백엔드가 구현되면
// 이 파일의 경로·타입만 실제 스펙에 맞게 고치면 되고, 화면 컴포넌트는
// 그대로 두어도 되도록 이 파일 안에 가정을 몰아넣었습니다.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Team 도메인 ──────────────────────────────────────────────────────────────

export interface TeamMemberDto {
  userId: number;
  name: string;
  profileImageUrl: string | null;
}

export interface TeamSummaryDto {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  projectFinished: boolean;
  memberCount: number;
}

export interface TeamDetailDto extends TeamSummaryDto {
  members: TeamMemberDto[];
}

export function listMyTeams(): Promise<TeamSummaryDto[]> {
  return request<TeamSummaryDto[]>("/teams", { method: "GET" });
}

export function getTeam(teamId: number): Promise<TeamDetailDto> {
  return request<TeamDetailDto>(`/teams/${teamId}`, { method: "GET" });
}

export function createTeam(name: string): Promise<TeamDetailDto> {
  return request<TeamDetailDto>("/teams", { method: "POST", body: JSON.stringify({ name }) });
}

export function joinTeam(inviteCode: string): Promise<TeamDetailDto> {
  return request<TeamDetailDto>("/teams/join", { method: "POST", body: JSON.stringify({ inviteCode }) });
}

export function leaveTeam(teamId: number): Promise<void> {
  return request<void>(`/teams/${teamId}/members/me`, { method: "DELETE" });
}

// ─── Title 도메인 ─────────────────────────────────────────────────────────────

export interface TitleDto {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
}

export function listTitles(): Promise<TitleDto[]> {
  return request<TitleDto[]>("/titles", { method: "GET" });
}

// ─── Evaluation 도메인 ────────────────────────────────────────────────────────

export interface EvaluationTargetDto {
  userId: number;
  name: string;
  profileImageUrl: string | null;
}

export function listEvaluationTargets(teamId: number): Promise<EvaluationTargetDto[]> {
  return request<EvaluationTargetDto[]>(`/teams/${teamId}/evaluations/targets`, { method: "GET" });
}

export interface EvaluationInput {
  targetUserId: number;
  attack: number;
  defense: number;
  speed: number;
  teamwork: number;
  creativity: number;
  problemSolving: number;
  titleIds: number[];
}

export function submitEvaluation(teamId: number, input: EvaluationInput): Promise<void> {
  return request<void>(`/teams/${teamId}/evaluations`, { method: "POST", body: JSON.stringify(input) });
}

// ─── Card 도감 도메인 ─────────────────────────────────────────────────────────

export interface CardTitleVoteDto {
  titleId: number;
  name: string;
  voteCount: number;
}

export interface CardSummaryDto {
  userId: number;
  name: string;
  profileImageUrl: string | null;
  representativeTitles: string[];
  stats: UserStatsDto;
}

export interface CardDetailDto extends CardSummaryDto {
  isUnlocked: boolean;
  remainingCount: number;
  biography: string | null;
  titleVotes: CardTitleVoteDto[];
}

export function listCards(): Promise<CardSummaryDto[]> {
  return request<CardSummaryDto[]>("/cards", { method: "GET" });
}

export function getCard(userId: number): Promise<CardDetailDto> {
  return request<CardDetailDto>(`/cards/${userId}`, { method: "GET" });
}

// ─── Chat(AI 분석) 도메인 ─────────────────────────────────────────────────────

export interface ChatSessionDto {
  id: number;
  title: string;
  targetUserIds: number[];
  createdAt: string;
}

export interface ChatMessageDto {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
}

export function createChatSession(targetUserIds: number[]): Promise<ChatSessionDto> {
  return request<ChatSessionDto>("/chat/sessions", { method: "POST", body: JSON.stringify({ targetUserIds }) });
}

export function sendChatMessage(sessionId: number, content: string): Promise<ChatMessageDto> {
  return request<ChatMessageDto>(`/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
