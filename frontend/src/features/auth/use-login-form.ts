import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth/auth-context"
import { ROLE_META } from "@/lib/auth/roles"

type Errors = { identifier?: string; password?: string; form?: string }

/** Shared state + submit logic for the client and admin login forms. */
export function useLoginForm(scope: "client" | "admin") {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!identifier.trim()) next.identifier = "Vui lòng nhập tên đăng nhập hoặc email."
    if (!password) next.password = "Vui lòng nhập mật khẩu."
    else if (password.length < 6) next.password = "Mật khẩu tối thiểu 6 ký tự."
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    const result = await login(identifier, password, scope)
    setSubmitting(false)
    if (!result.ok) {
      setErrors({ form: result.error })
      return
    }
    toast.success(`Xin chào, ${result.user.name}!`, { description: "Đăng nhập thành công." })
    navigate(result.user.mustChangePassword ? "/doi-mat-khau" : ROLE_META[result.user.role].home)
  }

  const setField = (field: "identifier" | "password", value: string) => {
    if (field === "identifier") setIdentifier(value)
    else setPassword(value)
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
  }

  return { identifier, password, errors, submitting, onSubmit, setField }
}
