import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Home } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-cream px-4 text-center">
      <motion.p
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-heading text-8xl font-extrabold text-brand"
      >
        404
      </motion.p>
      <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
      <p className="max-w-md text-ink-soft">Trang bạn tìm có thể đã bị di chuyển hoặc không tồn tại.</p>
      <Link to="/" className={buttonVariants()}>
        <Home /> Về trang chủ
      </Link>
    </div>
  )
}
