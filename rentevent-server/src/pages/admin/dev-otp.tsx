import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/AdminLayout'
import {
  MessageSquare,
  RefreshCw,
  Trash2,
  Phone,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Shield,
  User,
} from 'lucide-react'

interface OTPEntry {
  id: string
  phoneNumber: string
  code: string
  type: 'customer_auth' | 'admin_reset'
  message: string
  createdAt: string
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
  }
  return phone
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  )
  if (seconds < 10) return 'только что'
  if (seconds < 60) return `${seconds}с назад`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}м назад`
  const hours = Math.floor(minutes / 60)
  return `${hours}ч назад`
}

export default function DevOTPPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<OTPEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dev-otp')
      const data = await res.json()

      if (res.status === 403) {
        setError('prod')
        setLoading(false)
        return
      }

      if (data.success) {
        setEntries(data.entries)
        setError('')
      }
    } catch {
      setError('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Auto-refresh every 3 seconds
  useEffect(() => {
    if (!autoRefresh || error === 'prod') return
    const interval = setInterval(fetchEntries, 3000)
    return () => clearInterval(interval)
  }, [autoRefresh, error, fetchEntries])

  const handleClear = async () => {
    await fetch('/api/admin/dev-otp', { method: 'DELETE' })
    setEntries([])
  }

  const handleCopyCode = (entry: OTPEntry) => {
    navigator.clipboard.writeText(entry.code)
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Production mode — SMS is real, no dev log
  if (error === 'prod') {
    return (
      <>
        <Head>
          <title>SMS режим — RentEvent Admin</title>
        </Head>
        <AdminLayout title="SMS / OTP">
          <div className="max-w-lg mx-auto mt-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Рабочий режим (Eskiz)
            </h2>
            <p className="text-gray-500 mb-6">
              SMS отправляются через Eskiz. OTP-коды доставляются на реальные
              номера телефонов. Dev-лог недоступен в этом режиме.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              SMS_PROVIDER = eskiz
            </div>
          </div>
        </AdminLayout>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Dev OTP — RentEvent Admin</title>
      </Head>
      <AdminLayout title="SMS / OTP">
        {/* Dev Mode Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Режим разработки — SMS не отправляются
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              OTP-коды отображаются здесь вместо отправки на телефон.
              Переключите <code className="px-1 py-0.5 bg-amber-100 rounded">SMS_PROVIDER</code> на{' '}
              <code className="px-1 py-0.5 bg-amber-100 rounded">eskiz</code> в
              Railway для отправки реальных SMS.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={fetchEntries}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              Авто-обновление (3с)
            </label>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Очистить
            </button>
          )}
        </div>

        {/* OTP List */}
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Нет отправленных OTP-кодов</p>
            <p className="text-sm text-gray-400 mt-1">
              Коды появятся здесь при попытке входа или сброса пароля
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Type Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        entry.type === 'customer_auth'
                          ? 'bg-blue-500/10'
                          : 'bg-amber-500/10'
                      }`}
                    >
                      {entry.type === 'customer_auth' ? (
                        <User className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Shield className="h-5 w-5 text-amber-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Type Label */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            entry.type === 'customer_auth'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {entry.type === 'customer_auth'
                            ? 'Вход клиента'
                            : 'Сброс пароля'}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(entry.createdAt)}
                        </span>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-1">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {formatPhone(entry.phoneNumber)}
                      </div>

                      {/* SMS text */}
                      <p className="text-xs text-gray-400 truncate">
                        {entry.message}
                      </p>
                    </div>
                  </div>

                  {/* OTP Code */}
                  <button
                    onClick={() => handleCopyCode(entry)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shrink-0 group"
                    title="Нажмите, чтобы скопировать"
                  >
                    <span className="font-mono text-lg font-bold tracking-widest">
                      {entry.code}
                    </span>
                    {copiedId === entry.id ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminLayout>
    </>
  )
}
