import type { StarSummaryDto, StarDetailDto } from "../api";
import type { Stats, TitleVote, User, Rarity } from "../types";
import { FALLBACK_AVATAR } from "./avatar";

// ─── Utilities ────────────────────────────────────────────────────────────────
export const topTitles = (v: TitleVote[]) => { if (!v.length) return []; const m = Math.max(...v.map(x=>x.votes)); return v.filter(x=>x.votes===m).map(x=>x.title); };
// 초기 능력치 총합 상한(6개 스탯 x 1~10점)이 실제로는 40으로 제한되어 있어(구조상 60까지
// 가능하지만 게임 밸런스상 40이 실질 최대치), 6이 아닌 4로 나눠야 100 만점 스케일이 맞는다.
export const totalPower = (s: Stats) => Math.round(Object.values(s).reduce((a,b)=>a+b,0)/4);

// 잠긴 별(평가 미완료 상태에서 내려오는 stats:null)에 쓰는 빈 스탯.
export const ZERO_STATS: Stats = { attack:0, defense:0, agility:0, teamwork:0, mana:0, health:0 };

// 은하 화면 수치(1~10 EMA 점수)를 기존 육각형 차트가 가정하는 0~100 스케일로 맞춘다.
export function dtoStatsToStats(s: NonNullable<StarSummaryDto["stats"]>): Stats {
  return {
    attack: s.attack*10, defense: s.defense*10, agility: s.agility*10,
    teamwork: s.teamwork*10, mana: s.mana*10, health: s.health*10,
  };
}
export function rarityFromPower(power: number): Rarity {
  if (power>=85) return "legendary";
  if (power>=70) return "epic";
  if (power>=55) return "rare";
  return "common";
}
// 잠긴 별은 stats가 null로 내려오므로(등급을 매길 근거가 없음), 그 경우 null을 반환한다.
export function rarityFromStarStats(stats: StarSummaryDto["stats"] | null): Rarity | null {
  if (!stats) return null;
  return rarityFromPower(totalPower(dtoStatsToStats(stats)));
}
// 은하(목록/상세) API 응답을 기존 화면 컴포넌트가 쓰는 User 모양으로 변환한다.
// 평가를 완료하지 않은 뷰어에게는 stats/titles가 null로 내려오므로(§StarService.evaluateLockStatus)
// 여기서 안전하게 빈 값으로 대체해야 화면이 그대로 죽지 않는다.
export function starToUser(c: StarSummaryDto | StarDetailDto): User {
  const stats = c.stats ? dtoStatsToStats(c.stats) : ZERO_STATS;
  const titles = "titles" in c ? c.titles : undefined;
  const titleVotes: TitleVote[] = titles
    ? titles.map(tv=>({ title: tv.name, votes: tv.voteCount }))
    : c.representativeTitles.map(name=>({ title: name, votes: 1 }));
  return {
    id: c.userId,
    name: c.name,
    role: "",
    photo: c.profileImageUrl || FALLBACK_AVATAR,
    bio: "biography" in c ? (c.biography ?? "") : "",
    stats,
    titleVotes,
    rarity: c.stats ? rarityFromPower(totalPower(stats)) : "common",
    isUnlocked: "isUnlocked" in c ? c.isUnlocked : undefined,
    remainingCount: "remainingCount" in c ? c.remainingCount : undefined,
  };
}
// 별 목록(listStars)에 잠긴 별이 하나라도 섞여 있으면 "평가 미완료" 상태로 본다.
// 실제로는 뷰어 단위로 전체가 동일하게 잠기지만(§StarService.evaluateLockStatus), 개별 항목을
// 봐도 안전하도록 some()으로 판단한다.
export function deriveEvaluationLocked(stars: User[] | null): boolean {
  if (!stars) return false;
  return stars.some(c => c.isUnlocked === false);
}
