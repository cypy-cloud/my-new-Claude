// 사용자가 직접 입력하던 "계절/시기 이슈" 필드를 없애는 대신, 서버가 오늘 날짜 기준으로
// 자동 생성해 뉴스레터 프롬프트에 반영한다.
export function getCurrentSeasonContext(date: Date = new Date()): string {
  const month = date.getMonth() + 1
  const seasonLabel =
    month === 12 || month <= 2 ? '겨울(한파·빙판길·난방철)' :
    month <= 5 ? '봄(황사·알레르기·환절기)' :
    month <= 8 ? '여름(폭염·장마·휴가철)' :
    '가을(환절기·일교차)'
  return `${month}월, ${seasonLabel}`
}
