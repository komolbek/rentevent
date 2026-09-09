import { useEffect, useState } from 'react'
import Head from 'next/head'
import AdminLayout from '@/components/AdminLayout'
import { Search, ChevronLeft, ChevronRight, Eye, Phone, X } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone_number: string
  is_active: boolean
  created_at: string
  total_orders: number
  total_spent: number
}

interface CustomerDetail {
  id: string
  name: string
  phone_number: string
  is_active: boolean
  language: string
  created_at: string
  total_orders: number
  total_spent: number
  addresses: {
    id: string
    title: string
    full_address: string
    is_default: boolean
  }[]
  orders: {
    id: string
    order_number: string
    status: string
    total_amount: number
    created_at: string
    items_count: number
  }[]
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [page])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.append('search', search)

      const res = await fetch(`/api/admin/customers?${params}`)
      const json = await res.json()
      if (json.success) {
        setCustomers(json.data)
        setTotalPages(json.pagination.total_pages)
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCustomers()
  }

  const viewCustomerDetail = async (customerId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`)
      const json = await res.json()
      if (json.success) {
        setSelectedCustomer(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch customer detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const toggleCustomerStatus = async (customer: Customer) => {
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !customer.is_active,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchCustomers()
        if (selectedCustomer?.id === customer.id) {
          setSelectedCustomer({
            ...selectedCustomer,
            is_active: !customer.is_active,
          })
        }
      }
    } catch (err) {
      console.error('Failed to toggle customer status:', err)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CONFIRMED: 'Подтвержден',
      PREPARING: 'Готовится',
      DELIVERED: 'Доставлен',
      RETURNED: 'Возвращен',
      CANCELLED: 'Отменен',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-yellow-100 text-yellow-800',
      DELIVERED: 'bg-green-100 text-green-800',
      RETURNED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <>
      <Head>
        <title>Клиенты - RentEvent Admin</title>
      </Head>
      <AdminLayout title="Клиенты">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени или телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>

        {/* Customers Table */}
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
                        Клиент
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Телефон
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Заказов
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Потрачено
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Дата регистрации
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{customer.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={`tel:${customer.phone_number}`}
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            {customer.phone_number}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.total_orders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {formatPrice(customer.total_spent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleCustomerStatus(customer)}
                            className={`px-2 py-1 rounded text-sm ${
                              customer.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {customer.is_active ? 'Активен' : 'Заблокирован'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {formatDate(customer.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => viewCustomerDetail(customer.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Подробнее"
                          >
                            <Eye className="h-5 w-5" />
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

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-4 my-8 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Информация о клиенте</h3>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500">Имя</label>
                      <div className="font-medium">{selectedCustomer.name}</div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Телефон</label>
                      <a
                        href={`tel:${selectedCustomer.phone_number}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {selectedCustomer.phone_number}
                      </a>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Всего заказов</label>
                      <div className="font-medium">{selectedCustomer.total_orders}</div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Всего потрачено</label>
                      <div className="font-medium">{formatPrice(selectedCustomer.total_spent)}</div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Дата регистрации</label>
                      <div className="font-medium">{formatDate(selectedCustomer.created_at)}</div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Статус</label>
                      <span
                        className={`inline-block px-2 py-1 rounded text-sm ${
                          selectedCustomer.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedCustomer.is_active ? 'Активен' : 'Заблокирован'}
                      </span>
                    </div>
                  </div>

                  {/* Addresses */}
                  {selectedCustomer.addresses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Адреса</h4>
                      <div className="space-y-2">
                        {selectedCustomer.addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{addr.title}</div>
                              <div className="text-sm text-gray-500">{addr.full_address}</div>
                            </div>
                            {addr.is_default && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                По умолчанию
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders */}
                  {selectedCustomer.orders.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">История заказов</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Номер</th>
                              <th className="px-3 py-2 text-left">Дата</th>
                              <th className="px-3 py-2 text-left">Статус</th>
                              <th className="px-3 py-2 text-left">Товаров</th>
                              <th className="px-3 py-2 text-left">Сумма</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedCustomer.orders.map((order) => (
                              <tr key={order.id}>
                                <td className="px-3 py-2 font-medium">{order.order_number}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {formatDate(order.created_at)}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                      order.status
                                    )}`}
                                  >
                                    {getStatusLabel(order.status)}
                                  </span>
                                </td>
                                <td className="px-3 py-2">{order.items_count}</td>
                                <td className="px-3 py-2 font-medium">
                                  {formatPrice(order.total_amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  )
}
