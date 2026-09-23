"use client";

import { useEffect } from "react";

const LOCK_MS = 450;

const INTERACTIVE_SELECTOR = [
  "button",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[role="button"]',
].join(",");

function getInteractiveTarget(
  target: EventTarget | null
): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLElement>(
    INTERACTIVE_SELECTOR
  );
}

function isDisabled(
  element: HTMLElement
) {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement
  ) {
    return element.disabled;
  }

  return (
    element.getAttribute("aria-disabled") ===
    "true"
  );
}

export default function InteractionGuard() {
  useEffect(() => {
    const lastClick = new WeakMap<
      HTMLElement,
      number
    >();

    const timers = new WeakMap<
      HTMLElement,
      ReturnType<typeof setTimeout>
    >();

    function handleClick(event: MouseEvent) {
      const element =
        getInteractiveTarget(
          event.target
        );

      if (
        !element ||
        isDisabled(element)
      ) {
        return;
      }

      const now =
        performance.now();

      const previous =
        lastClick.get(element) ??
        -Infinity;

      if (
        now - previous <
        LOCK_MS
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      lastClick.set(
        element,
        now
      );

      element.dataset.auxPressLocked =
        "true";

      const previousTimer =
        timers.get(element);

      if (previousTimer) {
        clearTimeout(
          previousTimer
        );
      }

      const timer =
        setTimeout(() => {
          delete element.dataset
            .auxPressLocked;

          timers.delete(
            element
          );
        }, LOCK_MS);

      timers.set(
        element,
        timer
      );
    }

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick,
        true
      );
    };
  }, []);

  return null;
}
