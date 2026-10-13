import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_META } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";

type Errors = { identifier?: string; password?: string; form?: string }

/** Các vai trò có khu vực riêng (không tính guardian — chưa có khu vực). */
const AREA_ROLES: Role[] = ["student", "teacher", "staff", "admin"]

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

    // Đổi mật khẩu lần đầu trước khi vào khu vực nào.
    if (result.user.mustChangePassword) {
      navigate("/doi-mat-khau", { replace: true })
      return
    }
    // Nhiều vai trò: cho chọn khu vực. Một vai trò: về thẳng trang chủ vai trò.
    const areas = result.user.roles.filter((role) => AREA_ROLES.includes(role))
    if (areas.length > 1) {
      navigate("/chon-khu-vuc", { replace: true })
      return
    }
    const role = areas[0] ?? result.user.role
    navigate(ROLE_META[role].home, { replace: true })
  }

  const setField = (field: "identifier" | "password", value: string) => {
    if (field === "identifier") setIdentifier(value)
    else setPassword(value)
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
  }

  return { identifier, password, errors, submitting, onSubmit, setField }
}
