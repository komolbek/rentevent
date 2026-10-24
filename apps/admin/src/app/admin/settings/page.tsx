'use client';

import { useEffect, useState } from 'react'
import { Save, Building2, Phone, MapPin, Clock, MessageCircle, Navigation, Smartphone, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminSettingsApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface Settings {
  name: string
  phone: string
  address: string
  latitude: string
  longitude: string
  working_hours: string
  telegram_url: string | null
  app_store_url: string
  play_store_url: string
  product_notice: string
  product_notice_uz: string
  product_notice_en: string
}

// GET /admin/settings answers `{ settings: {...} }` with camelCase fields;
// read either casing so the form fills whichever shape comes back.
type RawSettings = Record<string, unknown>
const pick = (s: RawSettings, snake: string, camel: string): string => {
  const v = s[camel] ?? s[snake]
  return v == null ? '' : String(v)
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<Settings>({
    name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    working_hours: '',
    telegram_url: '',
    app_store_url: '',
    play_store_url: '',
    product_notice: '',
    product_notice_uz: '',
    product_notice_en: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data } = await adminSettingsApi.get()
      if (data.success) {
        const s: RawSettings = data.data?.settings ?? data.data ?? {}
        setSettings({
          name: pick(s, 'name', 'name'),
          phone: pick(s, 'phone', 'phone'),
          address: pick(s, 'address', 'address'),
          latitude: pick(s, 'latitude', 'latitude'),
          longitude: pick(s, 'longitude', 'longitude'),
          working_hours: pick(s, 'working_hours', 'workingHours'),
          telegram_url: pick(s, 'telegram_url', 'telegramUrl'),
          app_store_url: pick(s, 'app_store_url', 'appStoreUrl'),
          play_store_url: pick(s, 'play_store_url', 'playStoreUrl'),
          product_notice: pick(s, 'product_notice', 'productNotice'),
          product_notice_uz: pick(s, 'product_notice_uz', 'productNoticeUz'),
          product_notice_en: pick(s, 'product_notice_en', 'productNoticeEn'),
        })
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      const { data } = await adminSettingsApi.update({
        name: settings.name,
        phone: settings.phone,
        address: settings.address,
        latitude: settings.latitude ? parseFloat(settings.latitude) : null,
        longitude: settings.longitude ? parseFloat(settings.longitude) : null,
        working_hours: settings.working_hours,
        telegram_url: settings.telegram_url || null,
        app_store_url: settings.app_store_url.trim() || null,
        play_store_url: settings.play_store_url.trim() || null,
        product_notice: settings.product_notice.trim() || null,
        product_notice_uz: settings.product_notice_uz.trim() || null,
        product_notice_en: settings.product_notice_en.trim() || null,
      })
      if (data.success) {
        setSaved(true)
        toast.success(t('common.saved'))
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error(t('common.save_error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Настройки бизнеса</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Name */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="h-4 w-4 mr-2" />
                  Название компании
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="RentEvent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Телефон
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+998 90 123 45 67"
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  Адрес
                </label>
                <textarea
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="г. Ташкент, ул. Примерная, 123"
                />
              </div>

              {/* Location Coordinates */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  Координаты (для самовывоза)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Укажите координаты офиса для отображения на карте при самовывозе
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Широта</label>
                    <input
                      type="text"
                      value={settings.latitude}
                      onChange={(e) => setSettings({ ...settings, latitude: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="41.311081"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Долгота</label>
                    <input
                      type="text"
                      value={settings.longitude}
                      onChange={(e) => setSettings({ ...settings, longitude: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="69.240562"
                    />
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Clock className="h-4 w-4 mr-2" />
                  Часы работы
                </label>
                <input
                  type="text"
                  value={settings.working_hours}
                  onChange={(e) => setSettings({ ...settings, working_hours: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="09:00 - 18:00"
                />
              </div>

              {/* Telegram */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Ссылка на Telegram
                </label>
                <input
                  type="text"
                  value={settings.telegram_url || ''}
                  onChange={(e) => setSettings({ ...settings, telegram_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://t.me/username"
                />
              </div>

              {/* Mobile app store links */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Smartphone className="h-4 w-4 mr-2" />
                  {t('settings.app_links')}
                </label>
                <p className="text-xs text-gray-500 mb-2">{t('settings.app_links_hint')}</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">App Store</label>
                    <input
                      type="url"
                      value={settings.app_store_url}
                      onChange={(e) => setSettings({ ...settings, app_store_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://apps.apple.com/app/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Google Play</label>
                    <input
                      type="url"
                      value={settings.play_store_url}
                      onChange={(e) => setSettings({ ...settings, play_store_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://play.google.com/store/apps/details?id=..."
                    />
                  </div>
                </div>
              </div>

              {/* Red "!" notice shown on every product page */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                  {t('settings.product_notice')}
                </label>
                <p className="text-xs text-gray-500 mb-2">{t('settings.product_notice_hint')}</p>
                <div className="space-y-3">
                  {([
                    ['product_notice', 'RU'],
                    ['product_notice_uz', 'UZ'],
                    ['product_notice_en', 'EN'],
                  ] as const).map(([key, lang]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{lang}</label>
                      <textarea
                        rows={2}
                        value={settings[key]}
                        onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={lang === 'RU' ? t('settings.product_notice_placeholder') : ''}
                      />
                    </div>
                  ))}
                  {settings.product_notice.trim() && (
                    <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span className="whitespace-pre-line">{settings.product_notice}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                {saved && (
                  <span className="text-green-600 font-medium">Сохранено!</span>
                )}
              </div>
            </form>
          </div>

          {/* Additional Settings Sections */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Дополнительные настройки</h2>
            <p className="text-gray-500">
              Дополнительные настройки будут доступны в следующих версиях:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                Настройки доставки и зоны доставки
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                Шаблоны SMS уведомлений
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                Настройки расчета скидок
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                Управление администраторами
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
