'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, ImageOff, Expand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoCarouselProps {
  photos: string[];
  alt?: string;
}

export default function PhotoCarousel({ photos, alt = 'Property photo' }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(0);

  const hasPhotos = photos.length > 0;

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  const goPrev = useCallback(() => {
    if (!hasPhotos) return;
    const newIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    setDirection(-1);
    setCurrentIndex(newIndex);
  }, [currentIndex, photos.length, hasPhotos]);

  const goNext = useCallback(() => {
    if (!hasPhotos) return;
    const newIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    setDirection(1);
    setCurrentIndex(newIndex);
  }, [currentIndex, photos.length, hasPhotos]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') setIsFullscreen(false);
    },
    [goPrev, goNext]
  );

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  // Empty state placeholder
  if (!hasPhotos) {
    return (
      <div className="rounded-lg bg-zinc-800 overflow-hidden">
        <div className="aspect-video flex flex-col items-center justify-center text-muted-foreground">
          <ImageOff className="h-12 w-12 mb-2 opacity-40" />
          <p className="text-sm">No photos available</p>
        </div>
      </div>
    );
  }

  const renderMainImage = (inFullscreen: boolean) => (
    <div
      className={cn(
        'relative overflow-hidden',
        inFullscreen ? 'h-[70vh]' : 'aspect-video'
      )}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={`${currentIndex}-${inFullscreen ? 'fs' : 'normal'}`}
          src={photos[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          className="absolute inset-0 h-full w-full object-cover"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          draggable={false}
        />
      </AnimatePresence>

      {/* Prev / Next Arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Counter badge */}
      <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Fullscreen toggle (only in non-fullscreen view) */}
      {!inFullscreen && (
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          aria-label="View fullscreen"
        >
          <Expand className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const renderThumbnails = () => {
    if (photos.length <= 1) return null;

    return (
      <div className="flex gap-1.5 overflow-x-auto p-2 scrollbar-thin scrollbar-thumb-zinc-600">
        {photos.map((photo, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={cn(
              'flex-shrink-0 h-14 w-20 rounded-md overflow-hidden border-2 transition-all duration-200',
              index === currentIndex
                ? 'border-primary ring-1 ring-primary/50 opacity-100'
                : 'border-transparent opacity-60 hover:opacity-90'
            )}
            aria-label={`Go to photo ${index + 1}`}
          >
            <img
              src={photo}
              alt={`${alt} thumbnail ${index + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Main carousel */}
      <div
        className="rounded-lg bg-zinc-800 overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Photo carousel"
      >
        {renderMainImage(false)}
        {renderThumbnails()}
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
            aria-label="Photo fullscreen viewer"
          >
            {/* Close button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Close fullscreen"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Fullscreen image area */}
            <div
              className="w-full max-w-5xl px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {renderMainImage(true)}
              <div className="mt-4">{renderThumbnails()}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
