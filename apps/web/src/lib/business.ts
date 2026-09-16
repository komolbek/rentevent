'use client';

import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';

/** Not in Business Settings yet; the one address the contact form also uses. */
export const CONTACT_EMAIL = 'info@rentevent.uz';

export interface BusinessContacts {
  /** Display form, e.g. "+998 90 123 45 67"; empty when not set in admin. */
  phone: string;
  /** `tel:` href, digits only; empty when no phone. */
  phoneHref: string;
  address: string;
  telegramUrl: string;
  /** "@handle" for a t.me link, else the URL's host. */
  telegramLabel: string;
  workingHours: string;
  email: string;
  isLoading: boolean;
}

/**
 * Contact details come from Business Settings (admin → Настройки) and
 * nowhere else. There are deliberately no fallbacks: a placeholder phone or
 * address on a live site is worse than an empty slot, so callers render
 * nothing for a field that is not set.
 */
export function useBusinessContacts(): BusinessContacts {
  const { data, isLoading } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: () => settingsApi.getBusinessInfo(),
    staleTime: 10 * 60 * 1000,
  });

  const phone = (data?.phone ?? '').trim();
  const telegramUrl = (data?.telegramUrl ?? '').trim();
  let telegramLabel = '';
  if (telegramUrl) {
    const m = telegramUrl.match(/t\.me\/([^/?#]+)/i);
    telegramLabel = m ? `@${m[1]}` : telegramUrl.replace(/^https?:\/\//, '');
  }

  return {
    phone,
    phoneHref: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '',
    address: (data?.address ?? '').trim(),
    telegramUrl,
    telegramLabel,
    workingHours: (data?.workingHours ?? '').trim(),
    email: CONTACT_EMAIL,
    isLoading,
  };
}
