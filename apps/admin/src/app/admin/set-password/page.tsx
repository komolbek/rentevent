'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { adminAuthApi } from '@/lib/api';
import { Logo } from "@/components/Logo";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Verify the user is authenticated and needs to change password
    const checkAuth = async () => {
      try {
        const res = await adminAuthApi.checkSession();
        const data = res.data;

        if (!data.success || !data.staff?.mustChangePassword) {
          // Either not authenticated or doesn't need password change
          if (data.success) {
            router.push('/admin/dashboard');
          } else {
            router.push('/admin/login');
          }
          return;
        }
        setCheckingAuth(false);
      } catch {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const res = await adminAuthApi.setPassword({
        currentPassword: '',
        newPassword: password,
      });

      const data = res.data;

      if (data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.message || 'Ошибка установки пароля');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-orange text-white mb-4">
            <Logo className="h-4 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Установка пароля
          </h1>
          <p className="text-gray-500 mt-1">
            Установите пароль для вашего аккаунта
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
              <ShieldCheck className="h-6 w-6 text-primary-500" />
            </div>
            <p className="text-sm text-gray-500">
              Для безопасности вашего аккаунта установите надёжный пароль
              (минимум 6 символов)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Новый пароль
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                  autoFocus
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Подтвердите пароль
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                />
              </div>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= level * 3
                          ? password.length >= 12
                            ? 'bg-green-500'
                            : password.length >= 8
                            ? 'bg-yellow-500'
                            : 'bg-red-400'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {password.length < 6
                    ? 'Слишком короткий'
                    : password.length < 8
                    ? 'Приемлемый'
                    : password.length < 12
                    ? 'Хороший'
                    : 'Надёжный'}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || password.length < 6}
              className="w-full h-12 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Установить пароль'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
