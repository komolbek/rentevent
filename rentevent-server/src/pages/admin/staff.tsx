import { useState, useEffect } from 'react'
import Head from 'next/head'
import AdminLayout from '@/components/AdminLayout'
import {
  UserPlus,
  Phone,
  Edit2,
  Trash2,
  Loader2,
  X,
  Shield,
  ShieldCheck,
  Crown,
} from 'lucide-react'

interface StaffMember {
  id: string
  phoneNumber: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MANAGER'
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

const roleLabels: Record<string, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
}

const roleIcons: Record<string, typeof Crown> = {
  OWNER: Crown,
  ADMIN: ShieldCheck,
  MANAGER: Shield,
}

const roleColors: Record<string, string> = {
  OWNER: 'bg-amber-100 text-amber-700 border-amber-200',
  ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
  MANAGER: 'bg-gray-100 text-gray-700 border-gray-200',
}

function formatPhoneDisplay(phone: string): string {
  // +998901234567 → +998 90 123 45 67
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
  }
  return phone
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 7)
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRole, setFormRole] = useState<'OWNER' | 'ADMIN' | 'MANAGER'>(
    'MANAGER'
  )
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff')
      const data = await res.json()
      if (data.success) {
        setStaff(data.staff)
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value)
    if (formatted.replace(/\s/g, '').length <= 9) {
      setFormPhone(formatted)
    }
  }

  const openAddModal = () => {
    setEditingStaff(null)
    setFormName('')
    setFormPhone('')
    setFormRole('MANAGER')
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member)
    setFormName(member.name)
    // Extract 9-digit part from +998XXXXXXXXX
    const digits = member.phoneNumber.replace(/\D/g, '').slice(3)
    setFormPhone(formatPhoneInput(digits))
    setFormRole(member.role)
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formName.trim()) {
      setFormError('Введите имя сотрудника')
      return
    }

    const digits = formPhone.replace(/\s/g, '')
    if (digits.length !== 9) {
      setFormError('Введите корректный номер телефона')
      return
    }

    setSubmitting(true)

    try {
      if (editingStaff) {
        // Update existing staff
        const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            role: formRole,
          }),
        })
        const data = await res.json()

        if (data.success) {
          setStaff((prev) =>
            prev.map((s) => (s.id === editingStaff.id ? data.staff : s))
          )
          setShowModal(false)
        } else {
          setFormError(data.message)
        }
      } else {
        // Create new staff
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            phone: `+998${digits}`,
            role: formRole,
          }),
        })
        const data = await res.json()

        if (data.success) {
          setStaff((prev) => [data.staff, ...prev])
          setShowModal(false)
        } else {
          setFormError(data.message)
        }
      }
    } catch {
      setFormError('Ошибка подключения к серверу')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      })
      const data = await res.json()

      if (data.success) {
        setStaff((prev) =>
          prev.map((s) => (s.id === member.id ? data.staff : s))
        )
      }
    } catch (err) {
      console.error('Failed to toggle staff status:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        setStaff((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete staff:', err)
    }
    setDeleteConfirm(null)
  }

  return (
    <>
      <Head>
        <title>Сотрудники — RentEvent Admin</title>
      </Head>
      <AdminLayout title="Сотрудники">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">
              Управление сотрудниками и их правами доступа
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Добавить сотрудника
          </button>
        </div>

        {/* Staff List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-20">
            <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Нет добавленных сотрудников</p>
            <button
              onClick={openAddModal}
              className="text-primary-500 font-medium hover:text-primary-600"
            >
              Добавить первого сотрудника
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Сотрудник
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Телефон
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Роль
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Последний вход
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.map((member) => {
                    const RoleIcon = roleIcons[member.role]
                    return (
                      <tr
                        key={member.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          !member.isActive ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-semibold text-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {member.name}
                              </p>
                              {member.mustChangePassword && (
                                <p className="text-xs text-amber-600">
                                  Ожидает установку пароля
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {formatPhoneDisplay(member.phoneNumber)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleColors[member.role]}`}
                          >
                            <RoleIcon className="h-3 w-3" />
                            {roleLabels[member.role]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(member)}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              member.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {member.isActive ? 'Активен' : 'Неактивен'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(member.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Редактировать"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {deleteConfirm === member.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(member.id)}
                                  className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                  Да
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                  Нет
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(member.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingStaff
                    ? 'Редактировать сотрудника'
                    : 'Добавить сотрудника'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Имя сотрудника
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Введите имя"
                    className="w-full h-11 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                    autoFocus
                  />
                </div>

                {/* Phone (only for new staff) */}
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                        value={formPhone}
                        onChange={handlePhoneChange}
                        placeholder="## ### ## ##"
                        className="w-full h-11 rounded-xl border-2 border-gray-200 bg-gray-50 pl-[7.5rem] pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Роль
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) =>
                      setFormRole(
                        e.target.value as 'OWNER' | 'ADMIN' | 'MANAGER'
                      )
                    }
                    className="w-full h-11 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                  >
                    <option value="MANAGER">Менеджер</option>
                    <option value="ADMIN">Администратор</option>
                    <option value="OWNER">Владелец</option>
                  </select>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {formRole === 'OWNER' && 'Полный доступ + управление сотрудниками'}
                    {formRole === 'ADMIN' && 'Полный доступ к панели'}
                    {formRole === 'MANAGER' && 'Ограниченный доступ'}
                  </p>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-11 rounded-xl border-2 border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingStaff ? (
                      'Сохранить'
                    ) : (
                      'Добавить'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  )
}
