import { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'onLoad'> {
  src: string;
  alt: string;
  fallback?: string;
  placeholderClassName?: string;
  /** Optional srcset for responsive images */
  srcSet?: string;
  /** Optional sizes for responsive images */
  sizes?: string;
  /** Show skeleton placeholder while loading */
  skeleton?: boolean;
  /** Show blur placeholder while loading */
  blur?: boolean;
  /** Custom error fallback element */
  errorFallback?: React.ReactNode;
}

export function LazyImage({
  src,
  alt,
  fallback,
  className,
  placeholderClassName,
  srcSet,
  sizes,
  skeleton = true,
  blur = false,
  errorFallback,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      {
        rootMargin: '200px',
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  if (hasError) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }

    if (fallback) {
      return (
        <img
          src={fallback}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          {...props}
        />
      );
    }

    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 opacity-40"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={cn('relative', className)}>
      {/* Placeholder */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0',
            skeleton && 'animate-pulse bg-muted',
            blur && 'bg-muted/80 backdrop-blur-sm',
            placeholderClassName
          )}
          aria-hidden="true"
        />
      )}

      {/* Actual image - only rendered when in view */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}
