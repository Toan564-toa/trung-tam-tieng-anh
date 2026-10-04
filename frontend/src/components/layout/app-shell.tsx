import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronLeft,
  KeyRound,
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Logo } from "@/components/common/logo";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_META } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";
import { NOTIFICATIONS_BY_ROLE, NOTIFICATION_TONE } from "@/data/notifications";
import { ROLE_NAV_PATHS } from "@/lib/auth/role-nav";

export type ShellNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  soon?: boolean;
  /** Ưu tiên hiển thị trên thanh tab dưới cùng ở mobile. */
  primary?: boolean;
  /** Tiêu đề nhóm, hiển thị giữa các mục trong sidebar. */
  group?: string;
};

type AppShellProps = {
  nav: ShellNavItem[];
  variant: "client" | "admin";
  logoutTo: string;
  subtitle: string;
  /** Số mục tối đa hiển thị trên thanh tab mobile. */
  mobileTabCount?: number;
  /** Nội dung bổ sung trên thanh trên cùng (ví dụ ô tìm kiếm toàn cục của khu vực quản trị). */
  topbarExtra?: ReactNode;
};

const COLLAPSE_KEY = "ttnn.shell.collapsed";
const MAX_MOBILE_TABS = 4;

/** Hiệu ứng vào/ra chuẩn của Base UI cho popup (menu, popover). */
const popupMotion =
  "origin-top transition-[opacity,transform] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0";

const menuItemClass =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft outline-none transition-colors data-highlighted:bg-cream data-highlighted:text-ink";

/* ------------------------------------------------------------------ *
 * Menu nguoi dung
 * ------------------------------------------------------------------ */

function UserMenu({
  onLogout,
  profileTo,
}: {
  onLogout: () => void;
  profileTo: string | undefined;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger className="flex items-center gap-3 rounded-full p-1 pr-2 transition-colors outline-none hover:bg-cream data-popup-open:bg-cream">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand font-heading text-sm font-bold text-ink">
          {user.name.split(" ").pop()?.charAt(0)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-ink">
            {user.name}
          </span>
          <span className="block text-xs text-ink-soft">
            {ROLE_META[user.role].label}
          </span>
        </span>
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={8} className="z-50">
          <MenuPrimitive.Popup
            className={cn(
              popupMotion,
              "w-56 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-lift",
            )}
          >
            <div className="px-3 py-2 text-xs font-semibold text-ink-soft">
              {user.email}
            </div>
            {profileTo && (
              <MenuPrimitive.Item
                className={menuItemClass}
                onClick={() => navigate(profileTo)}
              >
                <UserRound className="size-4.5" /> Thông tin cá nhân
              </MenuPrimitive.Item>
            )}
            <MenuPrimitive.Item
              className={menuItemClass}
              onClick={() => navigate("/doi-mat-khau")}
            >
              <KeyRound className="size-4.5" /> Đổi mật khẩu
            </MenuPrimitive.Item>
            <MenuPrimitive.Separator className="my-1.5 h-px bg-slate-100" />
            <MenuPrimitive.Item
              className={cn(
                menuItemClass,
                "text-danger data-highlighted:bg-red-50 data-highlighted:text-danger",
              )}
              onClick={onLogout}
            >
              <LogOut className="size-4.5" /> Đăng xuất
            </MenuPrimitive.Item>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ *
 * Menu thong bao
 * ------------------------------------------------------------------ */

function NotificationBell({ role }: { role: Role }) {
  const items = NOTIFICATIONS_BY_ROLE[role];
  const [read, setRead] = useState<string[]>(() =>
    items.filter((n) => !n.unread).map((n) => n.id),
  );
  const navigate = useNavigate();
  const unreadCount = items.filter((n) => !read.includes(n.id)).length;

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) setRead(items.map((n) => n.id));
      }}
    >
      <Popover.Trigger
        aria-label={`Thông báo${unreadCount ? ` (${unreadCount} chưa đọc)` : ""}`}
        className="relative flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors outline-none hover:bg-cream data-popup-open:bg-cream"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          align="end"
          sideOffset={8}
          className="z-50 w-[22rem] max-w-[calc(100vw-2rem)]"
        >
          <Popover.Popup
            className={cn(
              popupMotion,
              "w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lift",
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <Popover.Title className="font-heading text-sm font-bold text-ink">
                Thông báo
              </Popover.Title>
              <Badge variant={unreadCount ? "warning" : "neutral"}>
                {unreadCount ? `${unreadCount} chưa đọc` : "Đã đọc hết"}
              </Badge>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => {
                const meta = NOTIFICATION_TONE[item.tone];
                const isRead = read.includes(item.id);
                return (
                  <li
                    key={item.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface",
                        !isRead && "bg-cream/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          meta.iconClass,
                        )}
                      >
                        <item.icon className="size-4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {item.title}
                          </span>
                          {!isRead && (
                            <span
                              className="size-1.5 shrink-0 rounded-full bg-danger"
                              aria-label="Chưa đọc"
                            />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-ink-soft">
                          {item.description}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {item.time}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-slate-100 bg-surface px-4 py-2.5 text-center text-xs font-medium text-ink-soft">
              <Check className="mr-1 inline size-3.5" /> Đã cập nhật tự động khi
              bạn mở danh sách
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ------------------------------------------------------------------ *
 * Sidebar
 * ------------------------------------------------------------------ */

function NavItems({
  nav,
  collapsed,
  dark,
  onNavigate,
}: {
  nav: ShellNavItem[];
  collapsed: boolean;
  dark: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {nav.map(
        ({ label, to, icon: Icon, end, soon, primary, group }, index) => {
          const showGroup = group && group !== nav[index - 1]?.group;
          return (
            <div key={to} className="flex flex-col gap-1">
              {showGroup && (
                <p
                  className={cn(
                    "px-3.5 pt-4 pb-1 text-[10px] font-bold tracking-[0.12em] uppercase",
                    collapsed && "px-0 text-center",
                    dark ? "text-slate-500" : "text-ink-soft",
                  )}
                >
                  {collapsed ? "•••" : group}
                </p>
              )}
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center" : "gap-3 px-3.5",
                    isActive && !soon
                      ? "bg-brand font-semibold text-ink shadow-glow"
                      : dark
                        ? "text-slate-400 hover:bg-white/5 hover:text-white"
                        : "text-ink-soft hover:bg-cream hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && !soon && !dark && (
                      <span
                        className="absolute top-1/2 -left-3.5 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-hover"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn("size-4.5 shrink-0", primary && "size-5")}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate">{label}</span>
                    )}
                    {!collapsed && soon && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          dark
                            ? "bg-white/10 text-slate-400"
                            : "bg-slate-100 text-ink-soft",
                        )}
                      >
                        Sắp có
                      </span>
                    )}
                    {collapsed && soon && (
                      <span
                        className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-slate-300"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </NavLink>
            </div>
          );
        },
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 * App shell
 * ------------------------------------------------------------------ */

/** Sidebar + topbar frame shared by the client and admin areas. */
export function AppShell({
  nav,
  variant,
  logoutTo,
  subtitle,
  mobileTabCount = MAX_MOBILE_TABS,
  topbarExtra,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dark = variant === "admin";

  /** Lưu pathname tại lúc mở drawer: tự đóng khi điều hướng (kể cả back/forward). */
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const mobileOpen = drawerPath !== null && drawerPath === location.pathname;
  const closeDrawer = () => setDrawerPath(null);
  const openDrawer = () => setDrawerPath(location.pathname);

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const onLogout = () => {
    logout();
    navigate(logoutTo);
  };

  const tabs = useMemo(() => {
    const primary = nav.filter((item) => item.primary && !item.soon);
    const rest = nav.filter((item) => !primary.includes(item));
    return [...primary, ...rest].slice(0, Math.min(mobileTabCount, nav.length));
  }, [nav, mobileTabCount]);

  const hiddenCount = nav.length - tabs.length;
  const profileTo = user ? ROLE_NAV_PATHS[user.role]?.profile : undefined;
  const home = user ? ROLE_META[user.role].home : "/";
  const currentLabel =
    nav.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    )?.label ?? "Cổng trung tâm";

  const sidebarContent = (isCollapsed: boolean) => (
    <div
      className={cn(
        "flex h-full flex-col gap-6 p-4",
        dark ? "bg-[#0F172A]" : "bg-white",
      )}
    >
      <div
        className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        <Logo
          to={home}
          tone={dark ? "dark" : "light"}
          subtitle={subtitle}
          className={isCollapsed ? "[&>span:last-child]:hidden" : undefined}
        />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={
            isCollapsed
              ? "Mở rộng thanh điều hướng"
              : "Thu gọn thanh điều hướng"
          }
          className={cn(
            "hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors lg:flex",
            dark
              ? "text-slate-400 hover:bg-white/10 hover:text-white"
              : "text-ink-soft hover:bg-cream hover:text-ink",
          )}
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      <NavItems
        nav={nav}
        collapsed={isCollapsed}
        dark={dark}
        onNavigate={closeDrawer}
      />

      <div className="flex flex-col gap-1">
        {!isCollapsed && (
          <div
            className={cn(
              "rounded-2xl p-3.5",
              dark ? "bg-white/5" : "bg-cream",
            )}
          >
            <p
              className={cn(
                "text-xs font-semibold",
                dark ? "text-slate-300" : "text-ink",
              )}
            >
              Cần hỗ trợ?
            </p>
            <p
              className={cn(
                "mt-1 text-xs leading-relaxed",
                dark ? "text-slate-400" : "text-ink-soft",
              )}
            >
              Liên hệ phòng tư vấn để được hỗ trợ nhanh nhất.
            </p>
            <a
              href="tel:0909123456"
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-2 text-xs font-bold text-ink transition-colors hover:bg-brand-hover"
            >
              <LayoutGrid className="size-3.5" /> Gọi 0909 123 456
            </a>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          title={isCollapsed ? "Đăng xuất" : undefined}
          className={cn(
            "flex cursor-pointer items-center rounded-xl py-2.5 text-sm font-medium transition-colors",
            isCollapsed ? "justify-center" : "gap-3 px-3.5",
            dark
              ? "text-slate-400 hover:bg-white/5 hover:text-white"
              : "text-ink-soft hover:bg-red-50 hover:text-danger",
          )}
        >
          <LogOut className="size-4.5" />
          {!isCollapsed && "Đăng xuất"}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn("min-h-svh", dark ? "bg-slate-100" : "bg-surface")}>
      <div
        className={cn(
          "grid transition-[grid-template-columns] duration-300 ease-out",
          collapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[264px_1fr]",
        )}
      >
        {/* Sidebar co dinh tren desktop */}
        <aside
          className={cn(
            "sticky top-0 hidden h-svh border-r lg:block",
            dark ? "border-white/5" : "border-slate-100",
          )}
        >
          {sidebarContent(collapsed)}
        </aside>

        {/* Drawer tren mobile */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeDrawer}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-72 shadow-lift lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{
                  type: "tween",
                  duration: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="relative h-full">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Đóng menu"
                    className="absolute top-5 right-4 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-cream"
                  >
                    <X className="size-5" />
                  </button>
                  {sidebarContent(false)}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-col">
          {/* Topbar */}
          <header
            className={cn(
              "sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6",
              dark
                ? "border-slate-200 bg-white/90"
                : "border-slate-100 bg-white/85",
            )}
          >
            <button
              type="button"
              className={cn(
                "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors lg:hidden",
                dark
                  ? "text-ink hover:bg-slate-100"
                  : "text-ink hover:bg-cream",
              )}
              onClick={openDrawer}
              aria-label="Mở menu"
            >
              <MenuIcon className="size-5" />
            </button>

            {topbarExtra}

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-xs font-medium",
                  dark ? "text-slate-400" : "text-ink-soft",
                )}
              >
                {subtitle}
              </p>
              <p
                className={cn(
                  "truncate font-heading text-sm font-bold",
                  dark ? "text-white" : "text-ink",
                )}
              >
                {currentLabel}
              </p>
            </div>

            <NotificationBell role={user?.role ?? "student"} />
            <UserMenu onLogout={onLogout} profileTo={profileTo} />
          </header>

          {/* Padding đáy phải chừa chỗ cho thanh tab cố định (mobile/tablet) và safe-area.
              Không dùng `p-*` rồi `pb-*` vì utility `p-*` sẽ đè mất padding đáy ở breakpoint kế tiếp. */}
          <main
            className={cn(
              "flex-1 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8",
              dark
                ? "pb-8"
                : "pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8",
            )}
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Thanh tab duoi cung tren mobile */}
      {!dark && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5">
            {tabs.map(({ label, to, icon: Icon, end, soon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-medium transition-colors",
                    isActive && !soon ? "text-ink" : "text-slate-400",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl transition-colors",
                        isActive && !soon
                          ? "bg-brand text-ink shadow-glow"
                          : "text-inherit",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="max-w-full truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={openDrawer}
                className="flex cursor-pointer flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-medium text-slate-400 transition-colors"
              >
                <span className="flex size-8 items-center justify-center rounded-xl">
                  <LayoutGrid className="size-5" />
                </span>
                Thêm
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
