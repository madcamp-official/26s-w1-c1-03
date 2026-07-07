import { starColorFor } from "../design-system/space";

// 사용자 id 기반 결정론적(=새로고침해도 안 변하는) 별 크기/반짝임 주기.
function seededRandom(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return s / 233280;
}

export interface StarLayout {
  left: string; top: string;
  size: number;
  color: string; glowC: string;
  breathe: string;
}

// design.md §68: 팀원은 그리드가 아니라 산개한 별. 인원수가 늘어도 겹치지 않고 자연스럽게
// 퍼지도록, 인덱스를 골든 앵글 나선(해바라기씨 배열)에 태워 좌표를 뽑는다. id는 크기/색/
// 반짝임 주기처럼 "그 사람 고유의" 값에만 쓴다 — 정렬 순서가 바뀌어도 그 사람 색은 안 바뀐다.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function starLayoutFor(id: number, index: number, total: number): StarLayout {
  const n = Math.max(total, 1);
  const rFrac = Math.sqrt((index + 0.5) / n);
  const theta = index * GOLDEN_ANGLE;
  const left = 50 + rFrac * 40 * Math.cos(theta);
  const top = 50 + rFrac * 38 * Math.sin(theta);

  const r1 = seededRandom(id * 13 + 1);
  const r2 = seededRandom(id * 13 + 2);
  const { color, glowC } = starColorFor(id);

  return {
    left: `${left.toFixed(2)}%`,
    top: `${top.toFixed(2)}%`,
    size: 12 + r1 * 9,
    color, glowC,
    breathe: `${(2.6 + r2 * 1.8).toFixed(1)}s`,
  };
}
