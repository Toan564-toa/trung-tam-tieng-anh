import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Home, ShieldX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/auth-context"
import { ROLE_META } from "@/lib/auth/roles"

export function ForbiddenPage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-cream px-4 text-center">
      <motion.p
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-heading text-8xl font-extrabold text-danger"
      >
        403
      </motion.p>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ShieldX className="size-7 text-danger" /> Không có quyền truy cập
      </h1>
      <p className="max-w-md text-ink-soft">
        Tài khoản{user ? ` ${user.name}` : ""} không có quyền xem khu vực này
        {user ? ` (vai trò: ${ROLE_META[user.role].label})` : ""}.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link to={user ? ROLE_META[user.role].home : "/"} className={buttonVariants()}>
          <Home /> Về trang chủ
        </Link>
      </div>
    </div>
  )
}
