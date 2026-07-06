"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

type HorizontalLoopCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  itemClassName?: string;
  scrollerClassName?: string;
};

export function HorizontalLoopCarousel({
  children,
  ariaLabel,
  previousLabel,
  nextLabel,
  itemClassName = "w-[86vw] max-w-[430px] shrink-0 snap-start sm:w-[58vw] lg:w-[31vw]",
  scrollerClassName = "overflow-x-auto scroll-smooth overscroll-x-contain pb-20 pt-10 pl-[max(1.25rem,calc((100vw-80rem)/2+1.25rem))] pr-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
}: HorizontalLoopCarouselProps) {
  const items = Children.toArray(children);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef(0);
  const loopTimeoutRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldLoop = items.length > 1;
  const displayItems = shouldLoop ? [...items, ...items] : items;

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(scrollFrameRef.current);
      window.clearTimeout(loopTimeoutRef.current);
    };
  }, []);

  if (items.length === 0) return null;

  function getCardStep() {
    const scroller = scrollRef.current;
    if (!scroller) return 0;
    const firstCard = scroller.firstElementChild?.firstElementChild as HTMLElement | null;
    const secondCard = scroller.firstElementChild?.children[1] as HTMLElement | null;
    if (!firstCard) return 0;
    if (!secondCard) return firstCard.offsetWidth;
    return secondCard.offsetLeft - firstCard.offsetLeft;
  }

  function jumpToDisplayIndex(index: number) {
    const cardStep = getCardStep();
    if (cardStep <= 0) return;
    scrollRef.current?.scrollTo({ left: cardStep * index, behavior: "instant" });
  }

  function scrollToDisplayIndex(index: number) {
    const cardStep = getCardStep();
    if (cardStep <= 0) return;
    scrollRef.current?.scrollTo({ left: cardStep * index, behavior: "smooth" });
  }

  function scrollToSlide(index: number) {
    const nextIndex = ((index % items.length) + items.length) % items.length;
    setActiveIndex(nextIndex);
    scrollToDisplayIndex(nextIndex);
  }

  function previousSlide() {
    window.clearTimeout(loopTimeoutRef.current);

    if (activeIndex === 0 && shouldLoop) {
      jumpToDisplayIndex(items.length);
      window.requestAnimationFrame(() => scrollToDisplayIndex(items.length - 1));
      setActiveIndex(items.length - 1);
      return;
    }

    scrollToSlide(activeIndex - 1);
  }

  function nextSlide() {
    window.clearTimeout(loopTimeoutRef.current);

    if (activeIndex === items.length - 1 && shouldLoop) {
      scrollToDisplayIndex(items.length);
      setActiveIndex(0);
      loopTimeoutRef.current = window.setTimeout(() => jumpToDisplayIndex(0), 520);
      return;
    }

    scrollToSlide(activeIndex + 1);
  }

  function handleCarouselScroll() {
    window.cancelAnimationFrame(scrollFrameRef.current);

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      const cardStep = getCardStep();
      if (!scroller || cardStep === 0) return;

      const displayIndex = Math.max(0, Math.round(scroller.scrollLeft / cardStep));
      const logicalIndex = displayIndex % items.length;
      setActiveIndex(logicalIndex);

      if (shouldLoop && displayIndex >= items.length) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = window.setTimeout(() => jumpToDisplayIndex(logicalIndex), 180);
      }
    });
  }

  return (
    <div aria-label={ariaLabel}>
      {shouldLoop ? (
        <div className="mx-auto flex max-w-7xl justify-end gap-2 px-5">
          <button
            type="button"
            onClick={previousSlide}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-900 shadow-sm transition hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)]"
            aria-label={previousLabel}
          >
            <CaretLeft size={20} />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-900 shadow-sm transition hover:border-[var(--grey-olive)] hover:text-[var(--grey-olive)]"
            aria-label={nextLabel}
          >
            <CaretRight size={20} />
          </button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={scrollerClassName}
        aria-live="polite"
        onScroll={handleCarouselScroll}
      >
        <div className="flex snap-x snap-mandatory gap-5">
          {displayItems.map((item, index) => (
            <div key={index} className={itemClassName}>
              {item}
            </div>
          ))}
        </div>
      </div>

      {shouldLoop ? (
        <div className="relative z-10 -mt-11 flex justify-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToSlide(index)}
              className={[
                "h-2.5 rounded-full transition",
                index === activeIndex ? "w-8 bg-[var(--grey-olive)]" : "w-2.5 bg-stone-300 hover:bg-stone-400",
              ].join(" ")}
              aria-label={`Ver item ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
