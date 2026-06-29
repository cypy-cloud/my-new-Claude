import { LoginForm } from "@/components/auth/login-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "로그인 - FP AI Assistant",
}

export default function LoginPage() {
  return <LoginForm />
}
