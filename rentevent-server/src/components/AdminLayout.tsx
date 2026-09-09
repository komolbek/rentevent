import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  Home,
  ShoppingCart,
  Package,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  UserPlus,
  MessageSquare,
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

interface StaffInfo {
  id: string
  name: string
  role: string
  phoneNumber: string
}

const navItems = [
  { href: '/admin/dashboard', label: 'Главная', icon: Home },
  { href: '/admin/orders', label: 'Заказы', icon: ShoppingCart },
  { href: '/admin/products', label: 'Товары', icon: Package },
  { href: '/admin/categories', label: 'Категории', icon: FolderOpen },
  { href: '/admin/customers', label: 'Клиенты', icon: Users },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
]

const ownerNavItems = [
  { href: '/admin/staff', label: 'Сотрудники', icon: UserPlus },
  { href: '/admin/dev-otp', label: 'SMS / OTP', icon: MessageSquare },
]

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<StaffInfo | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth')
      if (!res.ok) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.staff) {
        setStaff(data.staff)
      }
      // Redirect to set-password if needed
      if (data.staff?.mustChangePassword) {
        router.push('/admin/set-password')
        return
      }
      setLoading(false)
    } catch (err) {
      router.push('/admin/login')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const allNavItems =
    staff?.role === 'OWNER' ? [...navItems, ...ownerNavItems] : navItems

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <span className="text-xl font-bold text-primary-500">RentEvent</span>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {allNavItems.map((item) => {
            const Icon = item.icon
            const isActive = router.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Staff info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t">
          {staff && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-semibold text-sm">
                  {staff.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {staff.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {staff.role === 'OWNER'
                      ? 'Владелец'
                      : staff.role === 'ADMIN'
                      ? 'Администратор'
                      : 'Менеджер'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center px-4">
          <button
            className="lg:hidden mr-4"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </header>

        {/* Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
