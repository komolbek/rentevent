"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import { adminAuthApi } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";

const PUBLIC_ROUTES = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/set-password",
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, setStaff, clearAuth, setLoading } =
    useAdminAuthStore();

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await adminAuthApi.checkSession();
        setStaff(data.staff);

        if (data.staff.mustChangePassword && pathname !== "/admin/set-password") {
          router.replace("/admin/set-password");
        }
      } catch {
        clearAuth();
        if (!isPublicRoute) {
          router.replace("/admin/login");
        }
      }
    };

    checkAuth();
  }, []);

  // Public routes render without sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.replace("/admin/login");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
