'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { AuthGuard } from '@/components/auth-guard';
import { useAuthStore } from '@/stores/auth-store';
import { userApi } from '@/lib/api';
import type { IUser } from '@rentevent/types';
import { formatPhoneNumber } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Address } from '@/types';

function ProfilePageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, logout } = useAuthStore();

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
      toast.success(t('profile.address_deleted'));
      setDeletingAddressId(null);
    },
    onError: () => {
      toast.error(t('profile.address_delete_error'));
    },
  });

  // Set default address mutation
  const setDefaultAddressMutation = useMutation({
    mutationFn: userApi.setDefaultAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(t('profile.default_updated'));
    },
  });

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error(t('profile.enter_name_error'));
      return;
    }
    try {
      const updatedUser = await userApi.updateProfile(newName.trim());
      setUser(updatedUser);
      setIsEditingName(false);
      toast.success(t('profile.name_updated'));
    } catch (error) {
      toast.error(t('profile.name_error'));
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const menuItems = [
    {
      icon: Package,
      label: t('profile.my_orders'),
      href: '/orders',
      description: t('profile.orders_description'),
    },
    {
      icon: Heart,
      label: t('profile.favorites'),
      href: '/favorites',
      description: t('profile.favorites_description'),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-8"
      >
        {t('profile.title')}
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
                        placeholder={t('profile.your_name')}
                        className="max-w-xs"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveName}>
                        {t('profile.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingName(false);
                          setNewName(user?.name || '');
                        }}
                      >
                        {t('profile.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {user?.name || t('header.user_default_name')}
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
                    {user?.phoneNumber ? formatPhoneNumber(user.phoneNumber) : ''}
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
              <h3 className="text-lg font-semibold">{t('profile.delivery_addresses')}</h3>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddressModal(true);
                }}
              >
                {t('profile.add')}
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
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary-text">
                              {t('profile.default')}
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
                            title={t('profile.set_default')}
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
                <p className="text-muted-foreground mb-4">{t('profile.no_addresses')}</p>
                <Button
                  onClick={() => {
                    setEditingAddress(null);
                    setShowAddressModal(true);
                  }}
                >
                  {t('profile.add_address')}
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
              <h3 className="text-lg font-semibold">{t('profile.payment_methods')}</h3>
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
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary-text">
                          {t('profile.default')}
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
                  {t('profile.cards_auto_added')}
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
            <Link key={item.href} href={item.href}>
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
                <span className="font-medium">{t('profile.logout')}</span>
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
        title={editingAddress ? t('profile.edit_address') : t('profile.new_address')}
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
        title={t('profile.delete_address_title')}
        message={t('profile.delete_address_message')}
        confirmText={t('profile.delete')}
        variant="destructive"
        isLoading={deleteAddressMutation.isPending}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
}
