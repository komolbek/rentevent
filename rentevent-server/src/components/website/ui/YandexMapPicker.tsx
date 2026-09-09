'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, Loader2, CheckCircle, Navigation } from 'lucide-react';
import { cn } from '@/lib/website/utils';

// Tashkent center coordinates
const TASHKENT_CENTER: [number, number] = [41.2995, 69.2401];
const TASHKENT_BOUNDS = {
  minLat: 41.2,
  maxLat: 41.45,
  minLon: 69.1,
  maxLon: 69.45,
};

interface AddressData {
  fullAddress: string;
  city: string;
  district: string;
  street: string;
  building: string;
  latitude: number;
  longitude: number;
}

interface YandexMapPickerProps {
  onAddressSelect: (address: AddressData) => void;
  initialCoordinates?: [number, number];
  className?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps: any;
  }
}

export function YandexMapPicker({
  onAddressSelect,
  initialCoordinates,
  className,
}: YandexMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placemarkerRef = useRef<any>(null);
  const onAddressSelectRef = useRef(onAddressSelect);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep the ref updated
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  // Auto-dismiss error after 5 seconds
  const showError = useCallback((message: string) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setError(message);
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseGeocoderResult = useCallback((geoObject: any): AddressData | null => {
    try {
      const properties = geoObject.properties;
      const geometry = geoObject.geometry;
      const coords = geometry.getCoordinates();

      if (!coords) return null;

      const [lat, lon] = coords;

      // Check if within Tashkent bounds
      if (
        lat < TASHKENT_BOUNDS.minLat ||
        lat > TASHKENT_BOUNDS.maxLat ||
        lon < TASHKENT_BOUNDS.minLon ||
        lon > TASHKENT_BOUNDS.maxLon
      ) {
        return null;
      }

      const metaData = properties.get('metaDataProperty.GeocoderMetaData') as {
        text?: string;
        Address?: {
          Components?: Array<{ kind: string; name: string }>;
        };
      };

      const fullAddress = metaData?.text || '';
      const components = metaData?.Address?.Components || [];

      let city = '';
      let district = '';
      let street = '';
      let building = '';

      components.forEach((component) => {
        switch (component.kind) {
          case 'locality':
            city = component.name;
            break;
          case 'district':
          case 'area':
            if (!district) district = component.name;
            break;
          case 'street':
            street = component.name;
            break;
          case 'house':
            building = component.name;
            break;
        }
      });

      return {
        fullAddress,
        city: city || 'Ташкент',
        district,
        street,
        building,
        latitude: lat,
        longitude: lon,
      };
    } catch (err) {
      console.error('Error parsing geocoder result:', err);
      return null;
    }
  }, []);

  const handleMapClick = useCallback(async (coords: [number, number]) => {
    if (!window.ymaps || !mapRef.current) return;

    const [lat, lon] = coords;

    // Check bounds
    if (
      lat < TASHKENT_BOUNDS.minLat ||
      lat > TASHKENT_BOUNDS.maxLat ||
      lon < TASHKENT_BOUNDS.minLon ||
      lon > TASHKENT_BOUNDS.maxLon
    ) {
      showError('Доставка только по Ташкенту');
      return;
    }

    setError(null);

    // Update or create placemarker
    if (placemarkerRef.current) {
      placemarkerRef.current.geometry?.setCoordinates(coords);
    } else {
      placemarkerRef.current = new window.ymaps.Placemark(
        coords,
        {},
        {
          preset: 'islands#redDotIcon',
          draggable: true,
        }
      );
      mapRef.current.geoObjects.add(placemarkerRef.current);

      // Handle drag end
      placemarkerRef.current.events.add('dragend', () => {
        const newCoords = placemarkerRef.current?.geometry?.getCoordinates();
        if (newCoords) {
          handleMapClick(newCoords as [number, number]);
        }
      });
    }

    // Reverse geocode
    try {
      const result = await window.ymaps.geocode(coords);
      const geoObject = result.geoObjects.get(0);

      if (geoObject) {
        const addressData = parseGeocoderResult(geoObject);
        if (addressData) {
          // Use ref to avoid stale closure
          onAddressSelectRef.current(addressData);
          setSelectedAddress(addressData.fullAddress);
          setError(null);
        } else {
          showError('Не удалось определить адрес для этой точки');
        }
      } else {
        showError('Не удалось определить адрес');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      showError('Не удалось определить адрес. Проверьте подключение к интернету.');
    }
  }, [parseGeocoderResult, showError]);

  const handleSearch = useCallback(async () => {
    if (!window.ymaps || !mapRef.current || !searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      // Search within Tashkent
      const result = await window.ymaps.geocode(`Ташкент, ${searchQuery}`, {
        results: 1,
        boundedBy: [
          [TASHKENT_BOUNDS.minLat, TASHKENT_BOUNDS.minLon],
          [TASHKENT_BOUNDS.maxLat, TASHKENT_BOUNDS.maxLon],
        ],
        strictBounds: true,
      });

      const geoObject = result.geoObjects.get(0);

      if (geoObject) {
        const coords = geoObject.geometry.getCoordinates();
        if (coords) {
          mapRef.current.setCenter(coords, 17);
          handleMapClick(coords as [number, number]);
        }
      } else {
        showError('Адрес не найден. Попробуйте другой запрос.');
      }
    } catch (err) {
      console.error('Search error:', err);
      showError('Ошибка поиска. Проверьте подключение к интернету.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, handleMapClick, showError]);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showError('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];

        // Check if within Tashkent bounds
        if (
          coords[0] < TASHKENT_BOUNDS.minLat ||
          coords[0] > TASHKENT_BOUNDS.maxLat ||
          coords[1] < TASHKENT_BOUNDS.minLon ||
          coords[1] > TASHKENT_BOUNDS.maxLon
        ) {
          showError('Ваше местоположение за пределами Ташкента');
          setIsLocating(false);
          return;
        }

        if (mapRef.current) {
          mapRef.current.setCenter(coords, 17);
          handleMapClick(coords);
        }
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            showError('Разрешите доступ к геолокации в настройках браузера');
            break;
          case err.POSITION_UNAVAILABLE:
            showError('Местоположение недоступно');
            break;
          case err.TIMEOUT:
            showError('Время ожидания истекло. Попробуйте еще раз.');
            break;
          default:
            showError('Не удалось определить местоположение');
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [handleMapClick, showError]);

  useEffect(() => {
    // Load Yandex Maps API
    const loadYandexMaps = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.ymaps) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || '';
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
        script.async = true;
        script.onload = () => {
          window.ymaps.ready(() => resolve());
        };
        script.onerror = () => reject(new Error('Failed to load Yandex Maps'));
        document.head.appendChild(script);
      });
    };

    const initMap = async () => {
      try {
        await loadYandexMaps();

        if (!mapContainerRef.current || mapRef.current) return;

        const center = initialCoordinates || TASHKENT_CENTER;

        mapRef.current = new window.ymaps.Map(mapContainerRef.current, {
          center,
          zoom: initialCoordinates ? 17 : 12,
          controls: ['zoomControl', 'geolocationControl'],
        });

        // Restrict to Tashkent
        mapRef.current.options.set('restrictMapArea', [
          [TASHKENT_BOUNDS.minLat, TASHKENT_BOUNDS.minLon],
          [TASHKENT_BOUNDS.maxLat, TASHKENT_BOUNDS.maxLon],
        ]);

        // Click handler
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapRef.current.events.add('click', (e: any) => {
          const coords = e.get('coords') as [number, number];
          handleMapClick(coords);
        });

        // If initial coordinates, place marker
        if (initialCoordinates) {
          handleMapClick(initialCoordinates);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Map init error:', err);
        showError('Ошибка загрузки карты');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [initialCoordinates, handleMapClick, showError]);

  return (
    <div className={cn('relative', className)}>
      {/* Search bar */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск адреса..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white shadow-lg text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="h-10 px-4 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Найти'}
          </button>
          <button
            onClick={handleMyLocation}
            disabled={isLocating || isLoading}
            className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            title="Моё местоположение"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="w-full h-[300px] rounded-xl overflow-hidden border border-slate-200"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <span className="text-sm text-slate-500">Загрузка карты...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl">
            {error}
          </div>
        </div>
      )}

      {/* Selected address confirmation */}
      {selectedAddress && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-green-800 dark:text-green-200">
                Адрес выбран
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                {selectedAddress}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helper text */}
      {!selectedAddress && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="h-3 w-3" />
          <span>Нажмите на карту или найдите адрес для выбора точки доставки</span>
        </div>
      )}
    </div>
  );
}
