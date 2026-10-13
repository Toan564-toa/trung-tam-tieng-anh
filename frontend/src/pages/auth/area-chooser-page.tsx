import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BriefcaseBusiness, GraduationCap, Presentation, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { EASE } from "@/components/motion/reveal";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_META } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";

const ROLE_ICONS: Record<Role, LucideIcon> = {
  student: GraduationCap,
  teacher: Presentation,
  staff: BriefcaseBusiness,
  admin: ShieldCheck,
  guardian: Users,
};

/**
 * Màn chọn khu vực khi một tài khoản có nhiều vai trò
 * (ví dụ vừa học viên vừa giáo viên). Một vai trò thì
 * useLoginForm đã chuyển thẳng về trang chủ vai trò.
 */
export function AreaChooserPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (user.mustChangePassword) return <Navigate to="/doi-mat-khau" replace />;

  const areas = user.roles.filter((role) => role in ROLE_META);
  if (areas.length <= 1) return <Navigate to={ROLE_META[user.role].home} replace />;

  return (
    <div className="flex min-h-svh flex-col bg-cream">
      <header className="container-page flex items-center justify-between py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="w-full max-w-2xl"
        >
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <h1 className="text-3xl font-extrabold">Chào mừng, {user.name}</h1>
            <p className="text-sm text-ink-soft">
              Tài khoản của bạn có quyền truy cập nhiều khu vực. Chọn khu vực bạn muốn làm việc:
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {areas.map((role) => {
              const meta = ROLE_META[role];
              const Icon = ROLE_ICONS[role];
              return (
                <a
                  key={role}
                  href={meta.home}
                  className="group flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-soft transition-colors hover:border-brand hover:bg-cream"
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-ink">
                    <Icon className="size-6" />
                  </span>
                  <span className="flex items-center justify-between">
                    <span>
                      <span className="block text-lg font-bold text-ink">{meta.label}</span>
                      <span className="block text-sm text-ink-soft">{meta.description}</span>
                    </span>
                    <ArrowRight className="size-5 text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-brand" />
                  </span>
                </a>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
