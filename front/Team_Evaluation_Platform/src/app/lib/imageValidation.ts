// StorageService(백엔드) 검증 규칙과 동일하게 클라이언트에서도 먼저 걸러준다.
export const ALLOWED_IMAGE_TYPES = ["image/png","image/jpeg","image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5*1024*1024;
export function validateProfileImage(file: File): string|null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "PNG, JPG, WEBP 형식만 업로드할 수 있습니다.";
  if (file.size > MAX_IMAGE_SIZE_BYTES) return "파일 크기는 5MB를 초과할 수 없습니다.";
  return null;
}
