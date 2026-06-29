import Link from "next/link"
import { Zap } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg text-gray-900">FP AI Assistant</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-gray-500">
        <p>© 2024 FP AI Assistant</p>
      </footer>
    </div>
  )
}
