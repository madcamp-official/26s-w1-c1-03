import { useEffect, useState } from "react";

// 모바일 판정 기준(768px)은 화면 전체에서 공유한다 — 화면마다 기준이 다르면
// 사이드바는 데스크톱인데 본문은 모바일인 어중간한 조합이 생긴다.
const QUERY = "(max-width: 768px)";

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
