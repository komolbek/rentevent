import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reviewsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatDate } from '@/lib/utils';
import { Card, Button } from '@/components/ui';

interface ProductReviewsProps {
  productId: string;
}

function StarRating({
  rating,
  onRate,
  interactive = false,
  size = 'md',
}: {
  rating: number;
  onRate?: (rating: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (interactive ? hoverRating || rating : rating);
        return interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onRate?.(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors',
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ) : (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              isFilled
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

function ReviewForm({
  productId,
  onSuccess,
}: {
  productId: string;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const createReviewMutation = useMutation({
    mutationFn: reviewsApi.create,
    onSuccess: () => {
      toast.success(t('reviews.submitted'));
      setRating(0);
      setComment('');
      onSuccess();
    },
    onError: () => {
      toast.error(t('reviews.submit_error'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error(t('reviews.rating_required'));
      return;
    }
    createReviewMutation.mutate({ productId, rating, comment });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('reviews.your_rating')}
        </label>
        <StarRating rating={rating} onRate={setRating} interactive size="lg" />
      </div>
      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium mb-2">
          {t('reviews.your_comment')}
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('reviews.comment_placeholder')}
          className="w-full h-24 rounded-xl border-2 border-input bg-card px-4 py-3 text-sm resize-none focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
          aria-label={t('reviews.your_comment')}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        isLoading={createReviewMutation.isPending}
      >
        {t('reviews.submit')}
      </Button>
    </form>
  );
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['review-stats', productId],
    queryFn: () => reviewsApi.getStats(productId),
  });

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => reviewsApi.getByProduct(productId, { limit: 10 }),
  });

  const handleReviewSuccess = useCallback(() => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    queryClient.invalidateQueries({ queryKey: ['review-stats', productId] });
  }, [queryClient, productId]);

  const reviews = reviewsData?.items || [];

  return (
    <div className="space-y-6" aria-label={t('reviews.title')}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{t('reviews.title')}</h3>
        {isAuthenticated && !showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            leftIcon={<MessageSquare className="h-4 w-4" />}
          >
            {t('reviews.write_review')}
          </Button>
        )}
      </div>

      {/* Stats Section */}
      {stats && stats.totalReviews > 0 && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Average Rating */}
            <div className="text-center sm:text-left">
              <div className="text-4xl font-bold text-primary">
                {stats.averageRating.toFixed(1)}
              </div>
              <StarRating rating={Math.round(stats.averageRating)} size="sm" />
              <p className="text-sm text-muted-foreground mt-1">
                {t('reviews.count', { count: stats.totalReviews })}
              </p>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star] || 0;
                const percentage = stats.totalReviews > 0
                  ? (count / stats.totalReviews) * 100
                  : 0;

                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-3 text-right">{star}</span>
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={t('reviews.stars', { count: star })}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Review Form */}
      {showForm && isAuthenticated && (
        <Card className="p-6">
          <ReviewForm productId={productId} onSuccess={handleReviewSuccess} />
        </Card>
      )}

      {!isAuthenticated && (
        <p className="text-sm text-muted-foreground">{t('reviews.login_required')}</p>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted rounded mb-3" />
              <div className="h-3 w-full bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium mb-1">{t('reviews.no_reviews')}</p>
          <p className="text-sm text-muted-foreground">{t('reviews.no_reviews_desc')}</p>
        </Card>
      ) : (
        <div className="space-y-4" role="list" aria-label={t('reviews.title')}>
          {reviews.map((review) => (
            <Card key={review.id} className="p-4" role="listitem">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{review.userName}</p>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <time
                  className="text-sm text-muted-foreground"
                  dateTime={review.createdAt}
                >
                  {formatDate(review.createdAt)}
                </time>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
