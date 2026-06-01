"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import Autoplay from "embla-carousel-autoplay";
import { Cover } from "@/components/Cover";

export type FeaturedItem = {
  sourceId: string;
  slug: string;
  title: string;
  coverUrl?: string;
  coverReferer?: string;
  badge: string;
};

export function FeaturedBar({ items }: { items: FeaturedItem[] }) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const autoplay = useRef(
    Autoplay({ delay: 4500, stopOnMouseEnter: true, stopOnInteraction: false }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: "auto", containScroll: false },
    reduceMotion ? [WheelGesturesPlugin()] : [WheelGesturesPlugin(), autoplay.current],
  );

  const [canPrev, setCanPrev] = useState(true);
  const [canNext, setCanNext] = useState(true);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (items.length === 0) return null;

  return (
    <div className="group/bar relative">
      <div
        className="overflow-hidden px-4 sm:px-8 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]"
        ref={emblaRef}
      >
        <div className="flex gap-4">
          {items.map((item) => (
            <div key={`${item.sourceId}/${item.slug}`} className="w-36 flex-none sm:w-44 md:w-48">
              <Cover
                href={`/series/${item.sourceId}/${encodeURIComponent(item.slug)}`}
                title={item.title}
                coverUrl={item.coverUrl}
                coverReferer={item.coverReferer}
                badge={item.badge}
                vtKey={`${item.sourceId}/${item.slug}`}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Previous titles"
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!canPrev}
        className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-bg/80 p-2 text-content shadow-card ring-1 ring-border backdrop-blur transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-0 md:grid opacity-0 group-hover/bar:opacity-100"
      >
        <Chevron dir="left" />
      </button>
      <button
        type="button"
        aria-label="More titles"
        onClick={() => emblaApi?.scrollNext()}
        disabled={!canNext}
        className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-bg/80 p-2 text-content shadow-card ring-1 ring-border backdrop-blur transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-0 md:grid opacity-0 group-hover/bar:opacity-100"
      >
        <Chevron dir="right" />
      </button>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
