// Bắt lỗi render bất ngờ: hiển thị màn hình lỗi thân thiện
// thay vì trắng trang, kèm nút tải lại. Không lộ stack trace.

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { RotateCcw, TriangleAlert } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

type Props = { children: ReactNode }

type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Ghi log lỗi (không chứa dữ liệu người dùng) để vận hành kiểm tra.
    console.error("[ErrorBoundary]", error.message, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-cream px-4 text-center">
        <TriangleAlert className="size-12 text-warning" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Có lỗi xảy ra</h1>
        <p className="max-w-md text-ink-soft">
          Trang gặp sự cố khi hiển thị. Vui lòng tải lại. Nếu lỗi tiếp diễn, liên hệ quản trị viên.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/" className={buttonVariants()}>
            Về trang chủ
          </Link>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.reload()
            }}
            className={buttonVariants({ variant: "outline" })}
          >
            <RotateCcw /> Tải lại trang
          </button>
        </div>
      </div>
    )
  }
}
