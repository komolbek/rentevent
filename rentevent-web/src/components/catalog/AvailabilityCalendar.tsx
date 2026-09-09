import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';

interface AvailabilityCalendarProps {
  productId: string;
  totalStock: number;
}

const DAYS_OF_WEEK_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_OF_WEEK_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_OF_WEEK_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const MONTH_NAMES_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export function AvailabilityCalendar({ productId, totalStock }: AvailabilityCalendarProps) {
  const { t, locale } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const monthKey = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`;

  const { data: availability, isLoading } = useQuery({
    queryKey: ['product-availability', productId, monthKey],
    queryFn: () => productsApi.getAvailabilityCalendar(productId, monthKey),
    staleTime: 1000 * 60 * 5,
  });

  const availabilityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (availability) {
      availability.forEach((day) => {
        map.set(day.date, day.availableQuantity);
      });
    }
    return map;
  }, [availability]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.year;
    const month = currentMonth.month;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: Array<{ date: Date; day: number; isCurrentMonth: boolean } | null> = [];

    // Fill leading empty cells
    for (let i = 0; i < startDow; i++) {
      days.push(null);
    }

    // Fill actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: new Date(year, month, d),
        day: d,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  }, []);

  const getAvailabilityColor = (qty: number): string => {
    if (qty <= 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (qty <= Math.ceil(totalStock * 0.3)) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysOfWeek = locale === 'en' ? DAYS_OF_WEEK_EN : locale === 'uz' ? DAYS_OF_WEEK_UZ : DAYS_OF_WEEK_RU;
  const monthNames = locale === 'en' ? MONTH_NAMES_EN : locale === 'uz' ? MONTH_NAMES_UZ : MONTH_NAMES_RU;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">{t('availability.title')}</h3>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={t('availability.prev_month')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium" aria-live="polite">
          {monthNames[currentMonth.month]} {currentMonth.year}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={t('availability.next_month')}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-1" role="row">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
            role="columnheader"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={t('availability.title')}
      >
        {calendarDays.map((dayInfo, index) => {
          if (!dayInfo) {
            return <div key={`empty-${index}`} className="aspect-square" role="gridcell" />;
          }

          const dateStr = `${dayInfo.date.getFullYear()}-${String(dayInfo.date.getMonth() + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
          const isPast = dayInfo.date < today;
          const qty = availabilityMap.get(dateStr);
          const hasData = qty !== undefined;

          return (
            <div
              key={dateStr}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors',
                isPast && 'opacity-40',
                !isPast && hasData && getAvailabilityColor(qty),
                !isPast && !hasData && 'bg-muted/50',
                isLoading && 'animate-pulse bg-muted'
              )}
              role="gridcell"
              aria-label={`${dayInfo.day} - ${hasData ? `${qty} ${t('availability.units')}` : ''}`}
            >
              <span className="font-medium">{dayInfo.day}</span>
              {!isPast && hasData && !isLoading && (
                <span className="text-[10px] leading-tight">{qty}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/30" />
          <span>{t('availability.available')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-yellow-100 dark:bg-yellow-900/30" />
          <span>{t('availability.low_stock')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30" />
          <span>{t('availability.unavailable')}</span>
        </div>
      </div>
    </Card>
  );
}
