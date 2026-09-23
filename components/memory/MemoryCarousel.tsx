"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useRef,
  useState,
} from "react";

import type { Post } from "@/types";

export default function MemoryCarousel({
  post,
}: {
  post: Post;
}) {
  const [index, setIndex] =
    useState(0);

  const viewportRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const slides = [
    post.track.artwork_url,
    ...post.media.map(
      (media) =>
        media.public_url ||
        media.storage_path
    ),
  ].filter(Boolean) as string[];

  function goToSlide(
    nextIndex: number
  ) {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const safeIndex =
      Math.max(
        0,
        Math.min(
          nextIndex,
          slides.length - 1
        )
      );

    viewport.scrollTo({
      left:
        safeIndex *
        viewport.clientWidth,
      behavior: "smooth",
    });

    setIndex(safeIndex);
  }

  function previous() {
    goToSlide(index - 1);
  }

  function next() {
    goToSlide(index + 1);
  }

  return (
    <div className="memoryCarousel">
      <div
        ref={viewportRef}
        className="memoryViewport"
        onScroll={(event) => {
          const element =
            event.currentTarget;

          const nextIndex =
            Math.round(
              element.scrollLeft /
                element.clientWidth
            );

          setIndex(nextIndex);
        }}
      >
        {slides.map(
          (src, slideIndex) => (
            <div
              className="memorySlide"
              key={`${src}-${slideIndex}`}
            >
              <img
                src={src}
                alt={
                  slideIndex === 0
                    ? `Capa de ${post.track.title}`
                    : `Memória ${slideIndex} de ${post.author.display_name}`
                }
              />

              {slideIndex ===
                0 && (
                <div className="artworkOverlay">
                  <strong>
                    {
                      post.track
                        .title
                    }
                  </strong>

                  <span>
                    {
                      post.track
                        .artist
                    }
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="memoryArrow memoryArrowLeft"
            onClick={previous}
            disabled={index === 0}
            aria-label="Foto anterior"
          >
            <ChevronLeft
              size={20}
              strokeWidth={1.8}
            />
          </button>

          <button
            type="button"
            className="memoryArrow memoryArrowRight"
            onClick={next}
            disabled={
              index ===
              slides.length - 1
            }
            aria-label="Próxima foto"
          >
            <ChevronRight
              size={20}
              strokeWidth={1.8}
            />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div
          className="dots"
          aria-label={`${index + 1} de ${slides.length}`}
        >
          {slides.map(
            (_, dotIndex) => (
              <button
                type="button"
                className={
                  dotIndex === index
                    ? "activeDot"
                    : ""
                }
                key={dotIndex}
                onClick={() =>
                  goToSlide(
                    dotIndex
                  )
                }
                aria-label={`Ir para foto ${dotIndex + 1}`}
              >
                ●
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}