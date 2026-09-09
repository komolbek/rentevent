'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  Star,
  Plus,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useLanguageStore } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { userApi } from '@/lib/website/api';
import type { Address } from '@/lib/website/types';
import { formatPhoneNumber, cn } from '@/lib/website/utils';
import { Button, Card, Modal, Input, YandexMapPicker } from '@/components/website/ui';

interface AddressFormData {
  title: string;
  full_address: string;
  city: string;
  district: string;
  street: string;
  building: string;
  apartment: string;
  entrance: string;
  floor: string;
  latitude: number | null;
  longitude: number | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLanguageStore();
  const { isAuthenticated, user, setUser, _hasHydrated } = useAuthStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    title: '',
    full_address: '',
    city: 'Ташкент',
    district: '',
    street: '',
    building: '',
    apartment: '',
    entrance: '',
    floor: '',
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth?from=/profile');
      return;
    }

    fetchAddresses();
  }, [isAuthenticated, _hasHydrated, router]);

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const data = await userApi.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;

    try {
      setSavingName(true);
      const updatedUser = await userApi.updateProfile(newName.trim());
      setUser(updatedUser);
      setIsEditingName(false);
      toast.success(t.profile.nameUpdated);
    } catch (error) {
      toast.error(t.profile.updateError);
    } finally {
      setSavingName(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      await userApi.setDefaultAddress(addressId);
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr.id === addressId,
        }))
      );
      toast.success(t.common.success);
    } catch (error) {
      toast.error(t.profile.updateError);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await userApi.deleteAddress(addressId);
      setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
      toast.success(t.common.success);
    } catch (error) {
      toast.error(t.profile.updateError);
    }
  };

  const handleAddAddress = async () => {
    if (!addressForm.title.trim() || !addressForm.full_address.trim()) {
      toast.error(t.profile.fillRequiredFields || 'Please fill in required fields');
      return;
    }

    try {
      setSavingAddress(true);
      const newAddress = await userApi.createAddress({
        title: addressForm.title,
        fullAddress: addressForm.full_address,
        city: addressForm.city,
        district: addressForm.district || null,
        street: addressForm.street || null,
        building: addressForm.building || null,
        apartment: addressForm.apartment || null,
        entrance: addressForm.entrance || null,
        floor: addressForm.floor || null,
        latitude: addressForm.latitude,
        longitude: addressForm.longitude,
        isDefault: addresses.length === 0,
      });
      setAddresses((prev) => [...prev, newAddress]);
      setShowAddressModal(false);
      setAddressForm({
        title: '',
        full_address: '',
        city: 'Ташкент',
        district: '',
        street: '',
        building: '',
        apartment: '',
        entrance: '',
        floor: '',
        latitude: null,
        longitude: null,
      });
      toast.success(t.common.success);
    } catch (error) {
      console.error('Failed to add address:', error);
      toast.error(t.profile.updateError);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleMapAddressSelect = (addressData: {
    fullAddress: string;
    city: string;
    district: string;
    street: string;
    building: string;
    latitude: number;
    longitude: number;
  }) => {
    setAddressForm((prev) => ({
      ...prev,
      full_address: addressData.fullAddress,
      city: addressData.city || 'Ташкент',
      district: addressData.district,
      street: addressData.street,
      building: addressData.building,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
    }));
  };

  // Show loading state until hydration is complete
  if (!_hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">{t.profile.title}</h1>

      {/* Personal Info */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" />
          {t.profile.personalInfo}
        </h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              {t.profile.name}
            </label>
            {isEditingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder={t.profile.name}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !newName.trim()}
                  className="h-10 w-10 rounded-lg bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNewName(user.name || '');
                  }}
                  className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-medium">{user.name || '—'}</span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit3 className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              {t.profile.phone}
            </label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="font-medium">{formatPhoneNumber(user.phoneNumber)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Addresses */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-500" />
            {t.profile.addresses}
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddressModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t.profile.addAddress}
          </Button>
        </div>

        {loadingAddresses ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">{t.profile.noAddresses}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <motion.div
                key={address.id}
                layout
                className={cn(
                  'p-4 rounded-xl border transition-colors',
                  address.isDefault
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{address.title}</span>
                      {address.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500 text-white">
                          {t.profile.defaultAddress}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {address.fullAddress}
                    </p>
                    {address.street && (
                      <p className="text-sm text-slate-500 dark:text-slate-500">
                        {address.street}
                        {address.building && `, ${address.building}`}
                        {address.apartment && `, ${address.apartment}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(address.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t.profile.setAsDefault}
                      >
                        <Star className="h-4 w-4 text-slate-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                      title={t.profile.deleteAddress}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Address Modal */}
      <Modal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        title={t.profile.addAddress}
        size="xl"
      >
        <div className="space-y-4">
          {/* Map Picker */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
              {t.profile.selectOnMap || 'Выберите на карте'}
            </label>
            <YandexMapPicker
              onAddressSelect={handleMapAddressSelect}
              initialCoordinates={
                addressForm.latitude && addressForm.longitude
                  ? [addressForm.latitude, addressForm.longitude]
                  : undefined
              }
            />
          </div>

          <Input
            label={t.profile.addressTitle || 'Address Name'}
            placeholder={t.profile.addressTitlePlaceholder || 'Home, Work, etc.'}
            value={addressForm.title}
            onChange={(e) => setAddressForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />

          <Input
            label={t.profile.fullAddress || 'Full Address'}
            placeholder={t.profile.fullAddressPlaceholder || 'Street, building, apartment'}
            value={addressForm.full_address}
            onChange={(e) => setAddressForm((prev) => ({ ...prev, full_address: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.profile.city || 'City'}
              value={addressForm.city}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
              disabled
            />
            <Input
              label={t.profile.district || 'District'}
              placeholder={t.profile.districtPlaceholder || 'Mirzo Ulugbek, etc.'}
              value={addressForm.district}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, district: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.profile.street || 'Street'}
              placeholder={t.profile.streetPlaceholder || 'Street name'}
              value={addressForm.street}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, street: e.target.value }))}
            />
            <Input
              label={t.profile.building || 'Building'}
              placeholder={t.profile.buildingPlaceholder || 'Building number'}
              value={addressForm.building}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, building: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t.profile.apartment || 'Apartment'}
              placeholder={t.profile.apartmentPlaceholder || 'Apt #'}
              value={addressForm.apartment}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, apartment: e.target.value }))}
            />
            <Input
              label={t.profile.entrance || 'Entrance'}
              placeholder={t.profile.entrancePlaceholder || '#'}
              value={addressForm.entrance}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, entrance: e.target.value }))}
            />
            <Input
              label={t.profile.floor || 'Floor'}
              placeholder={t.profile.floorPlaceholder || '#'}
              value={addressForm.floor}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, floor: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowAddressModal(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleAddAddress} disabled={savingAddress}>
              {savingAddress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.common.saving || 'Saving...'}
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
