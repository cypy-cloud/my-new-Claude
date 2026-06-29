"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./button"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
      // 내부 메시지 노출 없이 친절한 메시지만 표시
      errorMessage: '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    }
  }

  componentDidCatch(error: Error) {
    // 클라이언트 에러는 서버 로깅 없이 콘솔만 출력
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <div className="text-center">
            <p className="font-medium text-red-700 text-sm">{this.state.errorMessage}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            다시 시도
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

// 훅 기반 에러 표시 (toast 없이 인라인)
export function ErrorMessage({ message }: { message: string }) {
  const safeMessage = message.includes('인증') || message.includes('권한') || message.includes('초과')
    ? message
    : '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'

  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{safeMessage}</span>
    </div>
  )
}
