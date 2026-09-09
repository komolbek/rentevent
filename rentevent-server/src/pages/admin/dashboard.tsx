import { useEffect, useState } from 'react'
import Head from 'next/head'
import AdminLayout from '@/components/AdminLayout'
import {
  ShoppingCart,
  DollarSign,
  Clock,
  RotateCcw,
  TrendingUp,
} from 'lucide-react'

interface DashboardData {
  today: {
    orders: number
    revenue: number
    pending_orders: number
    returns_due: number
  }
  week: { revenue: number }
  month: { revenue: number }
  totals: {
    products: number
    categories: number
    customers: number
  }
  orders_by_status: { status: string; count: number }[]
  revenue_by_day: { date: string; revenue: number }[]
  recent_orders: {
    id: string
    order_number: string
    status: string
    customer_name: string
    items_count: number
    total_amount: number
    created_at: string
  }[]
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      if (res.status === 401) {
        window.location.href = '/admin/login'
        return
      }
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CONFIRMED: 'Подтверждён',
      PREPARING: 'Подготовка',
      DELIVERED: 'Доставлен',
      RETURNED: 'Возвращён',
      CANCELLED: 'Отменён',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <AdminLayout title="Главная">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <>
      <Head>
        <title>Главная - RentEvent Admin</title>
      </Head>
      <AdminLayout title="Главная">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Заказы сегодня"
            value={data?.today?.orders || 0}
            icon={<ShoppingCart className="h-6 w-6 text-blue-600" />}
            color="blue"
          />
          <StatCard
            title="Выручка сегодня"
            value={formatPrice(data?.today?.revenue || 0)}
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
            color="green"
          />
          <StatCard
            title="Ожидают обработки"
            value={data?.today?.pending_orders || 0}
            icon={<Clock className="h-6 w-6 text-yellow-600" />}
            color="yellow"
          />
          <StatCard
            title="Возвраты сегодня"
            value={data?.today?.returns_due || 0}
            icon={<RotateCcw className="h-6 w-6 text-purple-600" />}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Выручка
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">За неделю</span>
                <span className="font-semibold">
                  {formatPrice(data?.week?.revenue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">За месяц</span>
                <span className="font-semibold">
                  {formatPrice(data?.month?.revenue || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Orders by Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Заказы по статусам</h3>
            <div className="space-y-2">
              {data?.orders_by_status?.map((item) => (
                <div
                  key={item.status}
                  className="flex justify-between items-center"
                >
                  <span
                    className={`px-2 py-1 rounded text-sm ${getStatusColor(
                      item.status
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Всего</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Товаров</span>
                <span className="font-semibold">{data?.totals?.products}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Категорий</span>
                <span className="font-semibold">{data?.totals?.categories}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Клиентов</span>
                <span className="font-semibold">{data?.totals?.customers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Последние заказы</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Заказ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.recent_orders?.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium">#{order.order_number}</span>
                      <span className="text-gray-500 ml-2">
                        ({order.items_count} товаров)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-sm ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>{icon}</div>
      </div>
    </div>
  )
}
