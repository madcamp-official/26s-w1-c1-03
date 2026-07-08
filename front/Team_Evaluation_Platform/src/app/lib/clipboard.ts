// navigator.clipboard.writeText는 비보안 컨텍스트/포커스 상실 등에서 조용히 reject될 수 있어,
// 성공 여부를 실제로 확인하고 실패 시 구형 execCommand 방식으로 한 번 더 시도한다.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
