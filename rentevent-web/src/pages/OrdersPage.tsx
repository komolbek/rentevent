import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowLeft, ChevronRight, Calendar, MapPin, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button, Card, Badge, EmptyState, OrderCardSkeleton } from '@/components/ui';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice, getOrderStatusLabel, getOrderStatusColor, getDeliveryTypeLabel } from '@/lib/utils';

export function OrdersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: '/orders' } });
    }
  }, [isAuthenticated, navigate]);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders({ limit: 20 }),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Мои заказы</h1>
          <p className="text-muted-foreground">
            {ordersData?.total || 0} заказов
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      ) : !ordersData?.items.length ? (
        <EmptyState
          icon={<Package className="h-16 w-16" />}
          title="Нет заказов"
          description="Ваши заказы появятся здесь после оформления"
          action={
            <Link to="/catalog">
              <Button size="lg" variant="gradient">
                Перейти в каталог
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {ordersData.items.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/orders/${order.id}`}>
                <Card hover className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          Заказ #{order.orderNumber}
                        </h3>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(order.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Items Preview */}
                  <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                    {order.items.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-muted"
                      >
                        {item.product.photos[0] ? (
                          <img
                            src={item.product.photos[0]}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="shrink-0 h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                          +{order.items.length - 4}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(order.rentalStartDate), 'd MMM', { locale: ru })} —{' '}
                      {format(new Date(order.rentalEndDate), 'd MMM', { locale: ru })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {order.deliveryType === 'DELIVERY' ? (
                        <Truck className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      {getDeliveryTypeLabel(order.deliveryType)}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-muted-foreground">
                      {order.items.length} товаров
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(order.totalAmount)} UZS
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
