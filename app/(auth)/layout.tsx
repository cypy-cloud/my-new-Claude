import Link from "next/link"
import { Zap } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex flex-col">
      <header className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">FP AI Assistant</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-blue-300">
        <p>© 2025 FP AI Assistant · 보험설계사 전용 AI 서비스</p>
      </footer>
    </div>
  )
}
