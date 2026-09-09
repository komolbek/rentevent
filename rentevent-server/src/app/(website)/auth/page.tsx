'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Card } from '@/components/website/ui';
import { authApi } from '@/lib/website/api';
import { useAuthStore, getDeviceId } from '@/stores/authStore';
import { cn } from '@/lib/website/utils';

type AuthStep = 'phone' | 'otp';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const from = searchParams?.get('from') || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(from);
    }
  }, [isAuthenticated, router, from]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 9) {
      setPhoneNumber(formatted);
    }
  };

  const handleSendOTP = async () => {
    const digits = phoneNumber.replace(/\s/g, '');
    if (digits.length !== 9) {
      toast.error('To\'g\'ri telefon raqamini kiriting');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.sendOTP(`+998${digits}`);
      setStep('otp');
      setCountdown(60);
      toast.success('Kod raqamingizga yuborildi');
      // Focus first OTP input
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (error) {
      toast.error('Kod yuborib bo\'lmadi. Keyinroq urinib ko\'ring.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newOtp.every(d => d)) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtpCode(newOtp);
      handleVerifyOTP(pastedData);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    setIsLoading(true);
    try {
      const digits = phoneNumber.replace(/\s/g, '');
      const response = await authApi.verifyOTP(`+998${digits}`, code, getDeviceId());
      login(response.token, response.user);
      toast.success('Xush kelibsiz!');
      router.push(from);
    } catch (error) {
      toast.error('Noto\'g\'ri kod. Qaytadan urinib ko\'ring.');
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card variant="elevated" className="p-8">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="mx-auto h-16 w-16 rounded-2xl bg-primary-500/10 flex items-center justify-center"
                  >
                    <Phone className="h-8 w-8 text-primary-500" />
                  </motion.div>
                  <h1 className="text-2xl font-bold">Hisobga kirish</h1>
                  <p className="text-slate-500 dark:text-slate-400">
                    Kirish uchun telefon raqamingizni kiriting
                  </p>
                </div>

                {/* Phone Input */}
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                      +998
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="90 123 45 67"
                      className="w-full h-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-16 pr-4 text-lg font-medium focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={handleSendOTP}
                    isLoading={isLoading}
                    disabled={phoneNumber.replace(/\s/g, '').length !== 9}
                    className="w-full h-14"
                    variant="gradient"
                  >
                    Kodni olish
                  </Button>
                </div>

                {/* Terms */}
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  &quot;Kodni olish&quot; tugmasini bosish orqali siz{' '}
                  <a href="/terms" className="text-primary-500 hover:underline">
                    foydalanish shartlari
                  </a>
                  ga rozilik bildirasiz
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Back Button */}
                <button
                  onClick={() => {
                    setStep('phone');
                    setOtpCode(['', '', '', '', '', '']);
                  }}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Raqamni o&apos;zgartirish
                </button>

                {/* Header */}
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">Kodni kiriting</h1>
                  <p className="text-slate-500 dark:text-slate-400">
                    SMS yuborildi{' '}
                    <span className="font-medium text-slate-900 dark:text-slate-100">+998 {phoneNumber}</span>
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex justify-center gap-2">
                  {otpCode.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => { otpInputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'w-12 h-14 rounded-xl border-2 text-center text-2xl font-bold transition-all',
                        'focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10',
                        digit ? 'border-primary-500 bg-primary-500/5' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      )}
                      disabled={isLoading}
                    />
                  ))}
                </div>

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                  </div>
                )}

                {/* Resend */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-slate-500 dark:text-slate-400">
                      Kodni qayta yuborish{' '}
                      <span className="font-medium text-slate-900 dark:text-slate-100">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-primary-500 hover:underline font-medium"
                    >
                      Kodni qayta yuborish
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
