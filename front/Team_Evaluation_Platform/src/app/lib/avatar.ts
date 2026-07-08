// 프로필 사진이 아직 없는 유저를 위한 기본 아바타
export const FALLBACK_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a2438"/><circle cx="50" cy="38" r="18" fill="#3a4a6a"/><ellipse cx="50" cy="92" rx="32" ry="24" fill="#3a4a6a"/></svg>'
);
// 프로필 사진 URL이 만료/삭제 등으로 로드 자체에 실패하면(단순히 null이라 ||로 대체되는
// 경우와 달리) 브라우저가 빈 아이콘만 남기고 영구히 방치하므로, 실패 시 폴백 아바타로 교체한다.
export function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  if (e.currentTarget.src !== FALLBACK_AVATAR) e.currentTarget.src = FALLBACK_AVATAR;
}
