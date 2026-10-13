import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { cn } from "cn";
import { toast } from "@/components/ui/toast";
import { DEMO_MODE, useAuth } from "@/lib/auth/auth-context";
import { ROLE_META } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";

const ROLES: Role[] = ["student", "teacher", "staff", "admin"];

/**
 * Demo-only: simulates a login for any role so each area can be previewed.
 * CHỈ hiển thị khi VITE_DEMO_MODE=true (mặc định tắt).
 */
export function DemoRolePicker({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [firstLogin, setFirstLogin] = useState(false);
  const dark = tone === "dark";

  if (!DEMO_MODE) return null;

  const pick = (role: Role) => {
    const user = demoLogin(role, firstLogin);
    toast.success(`Chế độ demo: ${ROLE_META[role].label}`, { description: `Đăng nhập với tài khoản ${user.name}.` });
    navigate(firstLogin ? "/doi-mat-khau" : ROLE_META[role].home);
  };

  return (
    <div className={cn("rounded-2xl border border-dashed p-4", dark ? "border-white/15 bg-white/5" : "border-brand/60 bg-cream")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn("flex items-center gap-2 text-sm font-bold", dark ? "text-white" : "text-ink")}>
          <FlaskConical className="size-4 text-brand-hover" /> Chế độ demo
        </p>
        <label className={cn("flex cursor-pointer items-center gap-2 text-xs font-medium", dark ? "text-slate-300" : "text-ink-soft")}>
          <input type="checkbox" checked={firstLogin} onChange={(e) => setFirstLogin(e.target.checked)} className="size-4 accent-amber-400" />
          Lần đăng nhập đầu
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROLES.map((role) => {
          const { label, icon: Icon } = ROLE_META[role];
          return (
            <motion.button
              key={role}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => pick(role)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-semibold transition-colors",
                dark ? "bg-white/5 text-slate-200 hover:bg-brand hover:text-ink" : "bg-white text-ink shadow-soft hover:bg-brand",
              )}
            >
              <Icon className="size-5" />
              {label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
