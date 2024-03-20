import { useState, useRef, useCallback, useEffect, MouseEvent } from "react";

export type UseHoverOptions = {
  /**
   * Amount of milliseconds to wait while hovering before opening.
   * Default is `0`
   */
  delayEnter?: number;
  /**
   * Amount of milliseconds to wait when mouse has left the trigger before closing.
   * Default is `0`
   */
  delayLeave?: number;
  /**
   * Determines whether the layer should hide when the user starts scrolling.
   * Default is `true`
   */
  hideOnScroll?: boolean;
};

export type PlainCallback = (...args: any[]) => void;

export type UseHoverProps = {
  onMouseEnter: PlainCallback;
  onMouseLeave: PlainCallback;
  onTouchStart: PlainCallback;
  onTouchMove: PlainCallback;
  onTouchEnd: PlainCallback;
};

export function useHover({
  delayEnter = 0,
  delayLeave = 0,
  hideOnScroll = true
}: UseHoverOptions = {}): readonly [boolean, UseHoverProps, () => void] {
  const [show, setShow] = useState(false);

  // single state: 
  // when enterTimeout is set, then it's also entering
  const enterTimeout = useRef<number | null>(null);
  // when exitTimeout is set, then it's also leaving
  const exitTimeout = useRef<number | null>(null);

  const hasTouchMoved = useRef<boolean>(false);

  // cleanup all timeouts
  const removeTimeout = useCallback(function removeTimeout() {
    if(enterTimeout.current) clearTimeout(enterTimeout.current);
    if(exitTimeout.current) clearTimeout(exitTimeout.current);
    enterTimeout.current = null;
    exitTimeout.current = null;
  }, []);

  function onMouseEnter() {
    // if was leaving, stop leaving
    if (exitTimeout.current) {
      removeTimeout();
    }

    if (show) {
      return;
    }

    // we're already entering and this is just a second onMouseEnter event, e.g., from a child element or maybe we have two triggers
    if(enterTimeout.current) return;

    // schedule entering
    enterTimeout.current = window.setTimeout(() => {
      setShow(true);
      enterTimeout.current = null;
    }, delayEnter);
  }

  function onMouseLeave(_: MouseEvent<unknown>, immediate?: boolean) {
    // if was waiting for entering,
    // clear timeout
    if (enterTimeout.current) {
      removeTimeout();
    }

    if (!show) {
      return;
    }

    if (immediate) {
      setShow(false);
      removeTimeout();
      return;
    }

    // we're already leaving and this is just a second onMouseEnter event
    if(exitTimeout.current) return;

    // schedule leaving
    exitTimeout.current = window.setTimeout(() => {
      setShow(false);
      exitTimeout.current = null;
    }, delayLeave);
  }

  // make sure to clear timeout on unmount
  useEffect(() => {
    function onScroll() {
      if (show && hideOnScroll) {
        removeTimeout();
        setShow(false);
      }
    }

    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [show, hideOnScroll, removeTimeout]);
  useEffect(() => {
    return () => {
        removeTimeout()
    };
  }, [removeTimeout])

  const hoverProps: UseHoverProps = {
    onMouseEnter,
    onMouseLeave,
    onTouchStart: () => {
      hasTouchMoved.current = false;
    },
    onTouchMove: () => {
      hasTouchMoved.current = true;
    },
    onTouchEnd: () => {
      if (!hasTouchMoved.current && !show) {
        setShow(true);
      }

      hasTouchMoved.current = false;
    }
  };

  return [show, hoverProps, () => onMouseLeave(null!, true)] as const;
}
