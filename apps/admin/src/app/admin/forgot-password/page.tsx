'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from "@/components/Logo";

type Step = 'phone' | 'otp' | 'password';

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7)
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 9) {
      setPhoneNumber(formatted);
    }
  };

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    setError('');
    const digits = phoneNumber.replace(/\s/g, '');
    if (digits.length !== 9) {
      setError('Введите корректный номер телефона');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/admin/auth/forgot-password/send-otp', {
        phone: `+998${digits}`,
      });
      const data = res.data;

      if (data.success) {
        setStep('otp');
        startCountdown();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(data.message || 'Ошибка отправки кода');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newOtp.every((d) => d)) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(''));
      handleVerifyOTP(pasted);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (code: string) => {
    setError('');
    setLoading(true);
    const digits = phoneNumber.replace(/\s/g, '');

    try {
      const res = await api.post('/admin/auth/forgot-password/verify-otp', {
        phone: `+998${digits}`,
        code,
      });
      const data = res.data;

      if (data.success) {
        setResetToken(data.resetToken);
        setStep('password');
      } else {
        setError(data.message || 'Неверный код');
        setOtpCode(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
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
      const res = await api.post('/admin/auth/forgot-password/reset-password', {
        resetToken,
        newPassword: password,
      });
      const data = res.data;

      if (data.success) {
        router.push('/admin/login?reset=success');
      } else {
        setError(data.message || 'Ошибка сброса пароля');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setOtpCode(['', '', '', '', '', '']);
    await handleSendOTP();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-orange text-white mb-4">
            <Logo className="h-4 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Восстановление пароля
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['phone', 'otp', 'password'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step === s
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                      : i < ['phone', 'otp', 'password'].indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < ['phone', 'otp', 'password'].indexOf(step) ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-8 h-0.5 ${
                      i < ['phone', 'otp', 'password'].indexOf(step)
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Phone */}
          {step === 'phone' && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
                  <Phone className="h-6 w-6 text-primary-500" />
                </div>
                <p className="text-sm text-gray-500">
                  Введите номер телефона, привязанный к вашему аккаунту
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер телефона
                </label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-gray-900 font-medium text-sm border-r border-gray-200 pr-3">
                      +998
                    </span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="## ### ## ##"
                    className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50 pl-[5.5rem] pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading || phoneNumber.replace(/\s/g, '').length !== 9}
                className="w-full h-12 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить код'
                )}
              </button>

              <div className="text-center">
                <Link
                  href="/admin/login"
                  className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Вернуться ко входу
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
                  <ShieldCheck className="h-6 w-6 text-primary-500" />
                </div>
                <p className="text-sm text-gray-500">
                  SMS отправлен на{' '}
                  <span className="font-medium text-gray-900">
                    +998 {phoneNumber}
                  </span>
                </p>
              </div>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-2">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className={`w-12 h-14 rounded-xl border-2 text-center text-2xl font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 ${
                      digit
                        ? 'border-primary-500 bg-primary-500/5'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    disabled={loading}
                  />
                ))}
              </div>

              {loading && (
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-500">
                    Повторная отправка через{' '}
                    <span className="font-medium text-gray-900">
                      {countdown}с
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                  >
                    Отправить код повторно
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setStep('phone');
                  setOtpCode(['', '', '', '', '', '']);
                  setError('');
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 inline-flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Изменить номер
              </button>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                  <Lock className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">
                  Придумайте новый пароль (минимум 6 символов)
                </p>
              </div>

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
                  'Сохранить новый пароль'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
