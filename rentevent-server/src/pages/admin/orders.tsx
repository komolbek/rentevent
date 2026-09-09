import { useEffect, useState } from 'react'
import Head from 'next/head'
import AdminLayout from '@/components/AdminLayout'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_photo: string | null
  quantity: number
  daily_price: number
  total_price: number
}

interface Order {
  id: string
  order_number: string
  status: string
  user: {
    id: string
    phone_number: string
    name: string | null
  }
  items: OrderItem[]
  items_count: number
  total_quantity: number
  total_amount: number
  delivery_type: string
  delivery_address: string | null
  rental_start_date: string
  rental_end_date: string
  payment_method: string
  payment_status: string
  created_at: string
}

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'CONFIRMED', label: 'Подтверждён' },
  { value: 'PREPARING', label: 'Подготовка' },
  { value: 'DELIVERED', label: 'Доставлен' },
  { value: 'RETURNED', label: 'Возвращён' },
  { value: 'CANCELLED', label: 'Отменён' },
]

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [page, status])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (status) params.append('status', status)
      if (search) params.append('search', search)

      const res = await fetch(`/api/admin/orders?${params}`)
      const json = await res.json()
      if (json.success) {
        setOrders(json.data)
        setTotalPages(json.pagination.total_pages)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchOrders()
  }

  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true)
    setStatusError('')
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        // Update selectedOrder locally so the UI reflects the change
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null)
        // Also update the order in the list
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        )
      } else {
        setStatusError(json.message || 'Ошибка при обновлении статуса')
      }
    } catch (err) {
      console.error('Failed to update order:', err)
      setStatusError('Ошибка сети')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
    return statusOptions.find((s) => s.value === status)?.label || status
  }

  return (
    <>
      <Head>
        <title>Заказы - RentEvent Admin</title>
      </Head>
      <AdminLayout title="Заказы">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по номеру, телефону, имени..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
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
                        Период аренды
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Сумма
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">
                            #{order.order_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.items_count} товаров, {order.total_quantity}{' '}
                            шт
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>{order.user.name || 'Без имени'}</div>
                          <div className="text-sm text-gray-500">
                            {order.user.phone_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {formatDate(order.rental_start_date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            — {formatDate(order.rental_end_date)}
                          </div>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => { setStatusError(''); setSelectedOrder(order); }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Управление
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Страница {page} из {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Order Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">
                Заказ #{selectedOrder.order_number}
              </h3>

              {/* Order Items with Images */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Товары в заказе</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      {item.product_photo ? (
                        <img
                          src={item.product_photo}
                          alt={item.product_name}
                          className="w-14 h-14 rounded object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded bg-gray-200 flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.product_name}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity} шт × {formatPrice(item.daily_price)}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatPrice(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Доставка:</span>
                  <span>{selectedOrder.delivery_type === 'DELIVERY' ? 'Доставка' : 'Самовывоз'}</span>
                </div>
                {selectedOrder.delivery_address && (
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Адрес:</span>
                    <span className="text-right max-w-[200px]">{selectedOrder.delivery_address}</span>
                  </div>
                )}
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Период:</span>
                  <span>{formatDate(selectedOrder.rental_start_date)} — {formatDate(selectedOrder.rental_end_date)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                  <span>Итого:</span>
                  <span>{formatPrice(selectedOrder.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Изменить статус
                  </label>
                  <select
                    value={selectedOrder.status}
                    disabled={updatingStatus}
                    onChange={(e) =>
                      updateOrderStatus(selectedOrder.id, e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    {statusOptions
                      .filter((s) => s.value)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                  {updatingStatus && (
                    <p className="text-sm text-blue-600 mt-1">Обновление...</p>
                  )}
                  {statusError && (
                    <p className="text-sm text-red-600 mt-1">{statusError}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  )
}
