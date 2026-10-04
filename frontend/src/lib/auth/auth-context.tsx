import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { demoUserFor, MOCK_ACCOUNTS } from "@/lib/auth/mock-accounts"
import type { AuthUser, Role } from "@/lib/auth/types"

const STORAGE_KEY = "ttnn.auth.user"

type LoginScope = "client" | "admin"
type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string }

type AuthContextValue = {
  user: AuthUser | null
  login: (identifier: string, password: string, scope: LoginScope) => Promise<LoginResult>
  demoLogin: (role: Role, firstLogin?: boolean) => AuthUser
  changePassword: (currentPassword: string, newPassword: string) => Promise<LoginResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next)
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const login = useCallback<AuthContextValue["login"]>(
    async (identifier, password, scope) => {
      await wait(700)
      const id = identifier.trim().toLowerCase()
      const account = MOCK_ACCOUNTS.find((a) => a.username === id || a.email === id)
      if (!account || account.password !== password) {
        return { ok: false, error: "Tên đăng nhập hoặc mật khẩu không đúng." }
      }
      if (scope === "admin" && account.role !== "admin") {
        return { ok: false, error: "Tài khoản này không có quyền quản trị." }
      }
      if (scope === "client" && account.role === "admin") {
        return { ok: false, error: "Vui lòng đăng nhập tài khoản Admin tại trang quản trị." }
      }
      const { password: _password, ...authUser } = account
      persist(authUser)
      return { ok: true, user: authUser }
    },
    [persist]
  )

  const demoLogin = useCallback<AuthContextValue["demoLogin"]>(
    (role, firstLogin = false) => {
      const demoUser = demoUserFor(role, firstLogin)
      persist(demoUser)
      return demoUser
    },
    [persist]
  )

  const changePassword = useCallback<AuthContextValue["changePassword"]>(
    async (currentPassword, newPassword) => {
      await wait(700)
      if (!user) return { ok: false, error: "Phiên đăng nhập đã hết hạn." }
      if (currentPassword === newPassword) {
        return { ok: false, error: "Mật khẩu mới phải khác mật khẩu hiện tại." }
      }
      const updated = { ...user, mustChangePassword: false }
      persist(updated)
      return { ok: true, user: updated }
    },
    [user, persist]
  )

  const logout = useCallback(() => persist(null), [persist])

  const value = useMemo(
    () => ({ user, login, demoLogin, changePassword, logout }),
    [user, login, demoLogin, changePassword, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
