"use client"

export default function OfflinePage() {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f9fafb' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80,
            borderRadius: 20,
            background: '#1e3a5f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
            </svg>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e3a5f', margin: '0 0 0.5rem' }}>
            오프라인 상태입니다
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            인터넷 연결을 확인한 후 다시 시도해주세요.<br />
            FP AI Assistant는 온라인 상태에서만 사용 가능합니다.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '0.75rem 2rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>

          <p style={{ marginTop: '3rem', color: '#9ca3af', fontSize: '0.8rem' }}>
            FP AI Assistant · 보험설계사를 위한 AI 업무 자동화
          </p>
        </div>
      </body>
    </html>
  )
}
