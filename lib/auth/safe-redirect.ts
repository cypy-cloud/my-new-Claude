// OAuth 콜백의 `next` 쿼리파라미터를 검증 없이 그대로 redirect에 쓰면, 예를 들어
// next=@evil.com/x 같은 값이 `${origin}${next}`와 합쳐질 때 브라우저가
// "www.openfp.co.kr@evil.com"을 userinfo@host로 해석해 evil.com으로 이동하는
// 오픈 리다이렉트가 가능하다. 내부의 단일 슬래시 상대경로만 허용한다.
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false
  if (!path.startsWith("/")) return false
  if (path.startsWith("//") || path.startsWith("/\\")) return false
  return true
}
