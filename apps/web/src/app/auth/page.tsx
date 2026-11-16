'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Where to send the visitor after a successful login. The cart and the
 * middleware both arrive here with ?redirect=/checkout — landing them on the
 * home page instead threw away the flow they were in the middle of. Only
 * same-origin paths are honoured.
 */
function getRedirectTarget(): string {
  if (typeof window === 'undefined') return '/';
  const target = new URLSearchParams(window.location.search).get('redirect');
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Card } from '@/components/ui';
import { authApi } from '@/lib/api';
import { useAuthStore, getDeviceId } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Reveal } from '@/components/home/Reveal';
import {
  applyOtpBackspace,
  applyOtpInput,
  classifyOtpError,
  emptyOtp,
  resendSeconds,
  type ClassifiedOtpError,
} from '@/lib/otp-input';

type AuthStep = 'phone' | 'otp';

export default function AuthPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(emptyOtp());
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(getRedirectTarget());
    }
  }, [isAuthenticated, router]);

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

  const otpErrorMessage = ({ kind, retryAfter }: ClassifiedOtpError): string => {
    switch (kind) {
      case 'invalid_phone':
        return t('auth.error_invalid_phone');
      case 'invalid_code':
        return t('auth.error_invalid_code');
      case 'code_expired':
        return t('auth.error_code_expired');
      case 'rate_limited':
        return retryAfter
          ? t('auth.error_rate_limited_wait', { seconds: retryAfter })
          : t('auth.error_rate_limited');
      case 'sms_unavailable':
        return t('auth.error_sms_unavailable');
      case 'network':
        return t('auth.error_network');
      default:
        return t('auth.error_send_failed');
    }
  };

  const handleSendOTP = async () => {
    const digits = phoneNumber.replace(/\s/g, '');
    if (digits.length !== 9) {
      toast.error(t('auth.error_invalid_phone'));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.sendOtp(`+998${digits}`);
      setStep('otp');
      setCountdown(resendSeconds());
      toast.success(t('auth.code_sent'));
      // Focus first OTP input
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (error) {
      const info = classifyOtpError(error);
      toast.error(otpErrorMessage(info));
      // Rate limited: the resend button waits for the server's time, not a fixed minute.
      if (info.kind === 'rate_limited') setCountdown(resendSeconds(info.retryAfter));
    } finally {
      setIsLoading(false);
    }
  };

  /** Typing, autofill (whole code in one box) and paste all end up here. */
  const applyOtp = (index: number, raw: string) => {
    const r = applyOtpInput(otpCode, index, raw);
    setOtpCode(r.digits);
    otpInputRefs.current[r.focusIndex]?.focus();
    // Auto-submit as soon as all six digits are in
    if (r.complete && !isLoading) handleVerifyOTP(r.digits.join(''));
  };

  const handleOtpChange = (index: number, value: string) => applyOtp(index, value);

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const r = applyOtpBackspace(otpCode, index);
      if (r) {
        e.preventDefault();
        setOtpCode(r.digits);
        otpInputRefs.current[r.focusIndex]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (index: number, e: React.ClipboardEvent) => {
    e.preventDefault();
    applyOtp(index, e.clipboardData.getData('text'));
  };

  const handleVerifyOTP = async (code: string) => {
    setIsLoading(true);
    try {
      const digits = phoneNumber.replace(/\s/g, '');
      const { token, user } = await authApi.verifyOtp(`+998${digits}`, code, getDeviceId());
      login(token, user);
      toast.success(t('auth.welcome'));
      router.replace(getRedirectTarget());
    } catch (error) {
      const info = classifyOtpError(error);
      toast.error(otpErrorMessage(info));
      // Too many attempts: the resend button waits for the server's time.
      if (info.kind === 'rate_limited') setCountdown(resendSeconds(info.retryAfter));
      setOtpCode(emptyOtp());
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
      <Reveal className="w-full max-w-md">
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
                    className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center"
                  >
                    <Phone className="h-8 w-8 text-primary" />
                  </motion.div>
                  <h1 className="text-2xl font-bold">{t('auth.login_title')}</h1>
                  <p className="text-muted-foreground">
                    {t('auth.login_description')}
                  </p>
                </div>

                {/* Phone Input */}
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      +998
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel-national"
                      aria-label={t('auth.login_description')}
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder={t('auth.phone_placeholder')}
                      className="w-full h-14 rounded-xl border-2 border-input bg-card pl-16 pr-4 text-lg font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
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
                    {t('auth.get_code')}
                  </Button>
                </div>

                {/* Terms */}
                <p className="text-center text-xs text-muted-foreground">
                  {t('auth.terms_agreement')}{' '}
                  <a href="/terms" className="text-primary-text hover:underline">
                    {t('auth.terms_link')}
                  </a>
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
                    setOtpCode(emptyOtp());
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.change_number')}
                </button>

                {/* Header */}
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">{t('auth.enter_code')}</h1>
                  <p className="text-muted-foreground">
                    {t('auth.sms_sent')}{' '}
                    <span className="font-medium text-foreground">+998 {phoneNumber}</span>
                  </p>
                </div>

                {/* OTP Input */}
                <div
                  className="flex justify-center gap-2"
                  role="group"
                  aria-label={t('auth.verification_code')}
                >
                  {otpCode.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => { otpInputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      aria-label={`${t('auth.verification_code')} ${index + 1}/6`}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={(e) => handleOtpPaste(index, e)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'w-12 h-14 rounded-xl border-2 text-center text-2xl font-bold transition-all',
                        'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
                        digit ? 'border-primary bg-primary/5' : 'border-input bg-card'
                      )}
                      disabled={isLoading}
                    />
                  ))}
                </div>

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {/* Resend */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-muted-foreground">
                      {t('auth.resend_timer')}{' '}
                      <span className="font-medium text-foreground">{countdown}{t('auth.seconds_suffix')}</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-primary-text hover:underline font-medium"
                    >
                      {t('auth.resend')}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </Reveal>
    </div>
  );
}
