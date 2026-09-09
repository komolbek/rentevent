import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
}

export default function AdminLogin() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isResetSuccess = router.query.reset === 'success'

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value)
    if (formatted.replace(/\s/g, '').length <= 9) {
      setPhoneNumber(formatted)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const digits = phoneNumber.replace(/\s/g, '')
    if (digits.length !== 9) {
      setError('Введите корректный номер телефона')
      return
    }

    if (!password) {
      setError('Введите пароль')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `+998${digits}`,
          password,
        }),
      })

      const data = await res.json()

      if (data.success) {
        if (data.mustChangePassword) {
          router.push('/admin/set-password')
        } else {
          router.push('/admin/dashboard')
        }
      } else {
        setError(data.message || 'Ошибка входа')
      }
    } catch (err) {
      setError('Ошибка подключения к серверу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Вход — RentEvent Admin</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-primary-500/25">
              4E
            </div>
            <h1 className="text-2xl font-bold text-gray-900">RentEvent</h1>
            <p className="text-gray-500 mt-1">Панель администратора</p>
          </div>

          {/* Password Reset Success */}
          {isResetSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-4 text-center">
              Пароль успешно изменён. Войдите с новым паролем.
            </div>
          )}

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone Input */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Номер телефона
                </label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-900 font-medium text-sm border-r border-gray-200 pr-3">
                      +998
                    </span>
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="## ### ## ##"
                    className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50 pl-[7.5rem] pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                    autoComplete="tel"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Пароль
                </label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  'Войти'
                )}
              </button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <Link
                  href="/admin/forgot-password"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                >
                  Забыли пароль?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
