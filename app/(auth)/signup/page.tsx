import { SignupForm } from "@/components/auth/signup-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "회원가입 - FP AI Assistant",
}

export default function SignupPage() {
  return <SignupForm />
}
