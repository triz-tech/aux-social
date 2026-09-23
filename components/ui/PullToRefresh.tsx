"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const TRIGGER_DISTANCE = 75;
const MAX_DISTANCE = 110;

export default function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const containerRef =
    useRef<HTMLDivElement>(null);

  const startY = useRef(0);
  const pulling = useRef(false);

  const [distance, setDistance] =
    useState(0);

  const [isPending, startTransition] =
    useTransition();

  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) return;

    function touchStart(
      event: TouchEvent
    ) {
      /*
       * Só começa o gesto se a
       * página estiver no topo.
       */
      if (window.scrollY > 0) {
        pulling.current = false;
        return;
      }

      startY.current =
        event.touches[0]?.clientY ?? 0;

      pulling.current = true;
    }

    function touchMove(
      event: TouchEvent
    ) {
      if (!pulling.current) {
        return;
      }

      if (window.scrollY > 0) {
        pulling.current = false;
        setDistance(0);
        return;
      }

      const currentY =
        event.touches[0]?.clientY ?? 0;

      const rawDistance =
        currentY - startY.current;

      /*
       * Está deslizando para cima:
       * não é pull-to-refresh.
       */
      if (rawDistance <= 0) {
        setDistance(0);
        return;
      }

      /*
       * Resistência estilo iOS.
       */
      const resistedDistance =
        Math.min(
          MAX_DISTANCE,
          rawDistance * 0.45
        );

      setDistance(
        resistedDistance
      );

      /*
       * Evita o bounce padrão
       * enquanto o AUX controla
       * o gesto.
       */
      if (rawDistance > 8) {
        event.preventDefault();
      }
    }

    function touchEnd() {
      if (!pulling.current) {
        return;
      }

      pulling.current = false;

      if (
        distance >=
        TRIGGER_DISTANCE
      ) {
        setDistance(54);

        startTransition(() => {
          router.refresh();
        });
      } else {
        setDistance(0);
      }
    }

    element.addEventListener(
      "touchstart",
      touchStart,
      {
        passive: true,
      }
    );

    element.addEventListener(
      "touchmove",
      touchMove,
      {
        passive: false,
      }
    );

    element.addEventListener(
      "touchend",
      touchEnd
    );

    return () => {
      element.removeEventListener(
        "touchstart",
        touchStart
      );

      element.removeEventListener(
        "touchmove",
        touchMove
      );

      element.removeEventListener(
        "touchend",
        touchEnd
      );
    };
  }, [
    distance,
    router,
  ]);

  useEffect(() => {
    if (!isPending) {
      setDistance(0);
    }
  }, [isPending]);

  const ready =
    distance >=
    TRIGGER_DISTANCE;

  return (
    <div
      ref={containerRef}
      className="pullRefreshRoot"
    >
      <div
        className={`pullRefreshIndicator ${
          ready
            ? "ready"
            : ""
        }`}
        style={{
          height:
            distance > 0 ||
            isPending
              ? Math.max(
                  distance,
                  isPending
                    ? 54
                    : 0
                )
              : 0,
        }}
      >
        <RefreshCw
          size={20}
          strokeWidth={1.8}
          className={
            isPending
              ? "pullRefreshSpinner"
              : ""
          }
          style={{
            transform:
              !isPending
                ? `rotate(${
                    Math.min(
                      distance /
                        TRIGGER_DISTANCE,
                      1
                    ) * 180
                  }deg)`
                : undefined,
          }}
        />

        <span>
          {isPending
            ? "atualizando..."
            : ready
              ? "solte para atualizar"
              : "puxe para atualizar"}
        </span>
      </div>

      <div
        className="pullRefreshContent"
        style={{
          transform:
            distance > 0 &&
            !isPending
              ? `translateY(${distance}px)`
              : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}