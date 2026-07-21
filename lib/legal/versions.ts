// app/terms, app/privacy 페이지의 "버전 vX.X" 표기와 반드시 일치시켜야 함.
// signup-form(이메일 가입)과 complete-profile-form(카카오 등 소셜 가입 후 약관 동의)이
// 이 상수를 공유해야 두 경로의 terms_version/privacy_version 기록이 항상 같은 값을 가리킨다
// (과거 signup-form에 이 값이 로컬로 하드코딩되어 있다가 약관 개정 후 안 맞았던 버그 재발 방지).
export const TERMS_VERSION = "v1.3"
export const PRIVACY_VERSION = "v1.1"
