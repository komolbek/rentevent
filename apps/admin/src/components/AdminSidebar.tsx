"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  UserCog,
  Settings,
  CalendarDays,
  Layers,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import { useAdminLanguageStore, type AdminLocale } from "@/stores/language-store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { adminAuthApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/admin/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/admin/products", labelKey: "nav.products", icon: Package },
  { href: "/admin/categories", labelKey: "nav.categories", icon: FolderTree },
  { href: "/admin/sets", labelKey: "nav.sets", icon: Layers },
  { href: "/admin/events", labelKey: "nav.events", icon: CalendarDays },
  { href: "/admin/orders", labelKey: "nav.orders", icon: ShoppingCart },
  { href: "/admin/customers", labelKey: "nav.customers", icon: Users },
  { href: "/admin/staff", labelKey: "nav.staff", icon: UserCog, ownerOnly: true },
  { href: "/admin/settings", labelKey: "nav.settings", icon: Settings },
];

const LANGS: { code: AdminLocale; label: string; full: string }[] = [
  { code: 'ru', label: 'RU', full: 'Русский' },
  { code: 'uz', label: 'UZ', full: "O\u2018zbekcha" },
  { code: 'en', label: 'EN', full: 'English' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, clearAuth } = useAdminAuthStore();
  const { t } = useTranslation();
  const { locale, setLocale } = useAdminLanguageStore();

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
    } catch {
      // ignore
    }
    clearAuth();
    router.push("/admin/login");
    toast.success(t('nav.logout'));
  };

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || staff?.role === "OWNER"
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-gray-900">RentEvent Admin</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4 space-y-3">
        <div
          role="radiogroup"
          aria-label={t('common.language')}
          className="inline-flex w-full items-center justify-between rounded-full border border-gray-200 bg-gray-50 p-1"
        >
          {LANGS.map((lang) => {
            const active = lang.code === locale;
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={lang.full}
                title={lang.full}
                onClick={() => setLocale(lang.code)}
                className={cn(
                  'flex-1 rounded-full px-2 py-1 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {lang.label}
              </button>
            );
          })}
        </div>

        {staff && (
          <div className="text-sm text-gray-500">
            <p className="font-medium text-gray-700">{staff.name}</p>
            <p>{staff.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
