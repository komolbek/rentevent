import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { userApi } from '@/lib/api';
import type { Address } from '@/types';

interface AddressFormProps {
  address?: Address;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddressForm({ address, onSuccess, onCancel }: AddressFormProps) {
  const [formData, setFormData] = useState({
    title: address?.title || '',
    fullAddress: address?.fullAddress || '',
    city: address?.city || 'Ташкент',
    district: address?.district || '',
    street: address?.street || '',
    building: address?.building || '',
    apartment: address?.apartment || '',
    entrance: address?.entrance || '',
    floor: address?.floor || '',
    latitude: address?.latitude || null,
    longitude: address?.longitude || null,
    isDefault: address?.isDefault || false,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => userApi.createAddress(data as Parameters<typeof userApi.createAddress>[0]),
    onSuccess: () => {
      toast.success('Адрес добавлен');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось добавить адрес');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => userApi.updateAddress(address!.id, data),
    onSuccess: () => {
      toast.success('Адрес обновлён');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось обновить адрес');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Введите название адреса');
      return;
    }
    if (!formData.fullAddress.trim()) {
      toast.error('Введите полный адрес');
      return;
    }

    if (address) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Название *"
        value={formData.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder="Дом, Офис, и т.д."
      />

      <Input
        label="Полный адрес *"
        value={formData.fullAddress}
        onChange={(e) => handleChange('fullAddress', e.target.value)}
        placeholder="ул. Амир Темур, д. 1, кв. 10"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Город"
          value={formData.city}
          onChange={(e) => handleChange('city', e.target.value)}
        />
        <Input
          label="Район"
          value={formData.district}
          onChange={(e) => handleChange('district', e.target.value)}
          placeholder="Мирзо-Улугбекский"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Улица"
          value={formData.street}
          onChange={(e) => handleChange('street', e.target.value)}
        />
        <Input
          label="Дом"
          value={formData.building}
          onChange={(e) => handleChange('building', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Квартира"
          value={formData.apartment}
          onChange={(e) => handleChange('apartment', e.target.value)}
        />
        <Input
          label="Подъезд"
          value={formData.entrance}
          onChange={(e) => handleChange('entrance', e.target.value)}
        />
        <Input
          label="Этаж"
          value={formData.floor}
          onChange={(e) => handleChange('floor', e.target.value)}
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.isDefault}
          onChange={(e) => handleChange('isDefault', e.target.checked)}
          className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
        />
        <span>Сделать адресом по умолчанию</span>
      </label>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isLoading}
        >
          Отмена
        </Button>
        <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
          {address ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
