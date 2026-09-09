import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  MapPin,
  CreditCard,
  Heart,
  Package,
  ChevronRight,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Card, Input, Modal, ConfirmModal, Skeleton } from '@/components/ui';
import { AddressForm } from '@/components/profile/AddressForm';
import { useAuthStore } from '@/stores/authStore';
import { userApi } from '@/lib/api';
import { formatPhoneNumber } from '@/lib/utils';
import type { Address } from '@/types';

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateProfile, logout } = useAuthStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Fetch addresses
  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: userApi.getAddresses,
  });

  // Fetch cards
  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: userApi.getCards,
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: userApi.deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Адрес удалён');
      setDeletingAddressId(null);
    },
    onError: () => {
      toast.error('Не удалось удалить адрес');
    },
  });

  // Set default address mutation
  const setDefaultAddressMutation = useMutation({
    mutationFn: userApi.setDefaultAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Адрес по умолчанию обновлён');
    },
  });

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error('Введите имя');
      return;
    }
    try {
      await updateProfile(newName.trim());
      setIsEditingName(false);
      toast.success('Имя обновлено');
    } catch (error) {
      toast.error('Не удалось обновить имя');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    {
      icon: Package,
      label: 'Мои заказы',
      href: '/orders',
      description: 'История и статус заказов',
    },
    {
      icon: Heart,
      label: 'Избранное',
      href: '/favorites',
      description: 'Сохранённые товары',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-8"
      >
        Профиль
      </motion.h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ваше имя"
                        className="max-w-xs"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveName}>
                        Сохранить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingName(false);
                          setNewName(user?.name || '');
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {user?.name || 'Пользователь'}
                      </h2>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                  <p className="text-muted-foreground">
                    {user?.phone_number ? formatPhoneNumber(user.phone_number) : ''}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Addresses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Адреса доставки</h3>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddressModal(true);
                }}
              >
                Добавить
              </Button>
            </div>

            {addressesLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : addresses && addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <Card key={address.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{address.title}</p>
                          {address.isDefault && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              По умолчанию
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {address.fullAddress}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!address.isDefault && (
                          <button
                            onClick={() => setDefaultAddressMutation.mutate(address.id)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Сделать по умолчанию"
                          >
                            <Check className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingAddress(address);
                            setShowAddressModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeletingAddressId(address.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Нет сохранённых адресов</p>
                <Button
                  onClick={() => {
                    setEditingAddress(null);
                    setShowAddressModal(true);
                  }}
                >
                  Добавить адрес
                </Button>
              </Card>
            )}
          </motion.div>

          {/* Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Способы оплаты</h3>
            </div>

            {cardsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
              </div>
            ) : cards && cards.length > 0 ? (
              <div className="space-y-3">
                {cards.map((card) => (
                  <Card key={card.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{card.cardType}</p>
                        <p className="text-sm text-muted-foreground">
                          •••• {card.cardNumber.slice(-4)}
                        </p>
                      </div>
                      {card.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          По умолчанию
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Карты добавляются автоматически при оплате
                </p>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Sidebar Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card hover className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}

          <button onClick={handleLogout} className="w-full">
            <Card hover className="p-4">
              <div className="flex items-center gap-4 text-destructive">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-5 w-5" />
                </div>
                <span className="font-medium">Выйти из аккаунта</span>
              </div>
            </Card>
          </button>
        </motion.div>
      </div>

      {/* Address Modal */}
      <Modal
        isOpen={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        title={editingAddress ? 'Редактировать адрес' : 'Новый адрес'}
        size="lg"
      >
        <AddressForm
          address={editingAddress || undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            setShowAddressModal(false);
            setEditingAddress(null);
          }}
          onCancel={() => {
            setShowAddressModal(false);
            setEditingAddress(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingAddressId}
        onClose={() => setDeletingAddressId(null)}
        onConfirm={() => deletingAddressId && deleteAddressMutation.mutate(deletingAddressId)}
        title="Удалить адрес?"
        message="Вы уверены, что хотите удалить этот адрес? Это действие нельзя отменить."
        confirmText="Удалить"
        variant="destructive"
        isLoading={deleteAddressMutation.isPending}
      />
    </div>
  );
}
