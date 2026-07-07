import { Component } from "react";
import type { ReactNode } from "react";

// 화면 하나가 예기치 못한 렌더링 오류(예: 백엔드 응답 모양이 프론트 가정과 달라 발생하는
// 타입 오류)로 죽어도 앱 전체가 새까맣게 사라지는 대신 해당 화면에만 안내 문구가 뜨게 한다.
export class ScreenErrorBoundary extends Component<{ children: ReactNode }, { error: Error|null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:"28px 32px", display:"flex", flexDirection:"column", gap:6 }}>
          <p style={{ fontSize:14, fontWeight:700, color:"#ef4444", fontFamily:"'Noto Sans KR'" }}>화면을 표시하는 중 문제가 발생했습니다.</p>
          <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>다른 메뉴를 눌렀다가 다시 돌아오거나, 새로고침해주세요.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
