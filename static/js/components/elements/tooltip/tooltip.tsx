import styled from "@emotion/styled";
import type { Placement } from "@floating-ui/react";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useMergeRefs,
} from "@floating-ui/react";
import React, {
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import theme from "../../../theme/theme";

// Options are: top, top-start, top-end, right, right-start, right-end,
// bottom, bottom-start, bottom-end, left, left-start, and left-end
type TooltipPlacement = Placement;

interface TooltipProps {
  // The content of the tooltip itself. This can be a string or ReactNode.
  title: ReactNode;
  // The trigger of the tooltip. This can be any ReactNode.
  children: ReactNode;
  // Placement of the tooltip relative to the trigger. It will self-adjust if no room.
  // Default is 'bottom-start' when followCursor is true, else 'top'.
  placement?: TooltipPlacement;
  // The tooltip follows the mouse cursor if true. Default false.
  followCursor?: boolean;
  // Touch events do not open the tooltip if true. Default false. This can be used to
  // suppress touch opening the tooltip when the tooltip is an action.
  disableTouchListener?: boolean;
  // Skidding along the axis of the placement (movement laterally - not away from tooltip)
  skidding?: number;
  // Distance in the perpendicular axis of the placement (away from tooltip)
  distance?: number;
  // Fade transition duration in ms. Defaults to 100ms.
  fadeDuration?: number;
  // Entry animation duration in ms. Defaults to 150ms.
  entryDuration?: number;
  // Delay before closing the tooltip when the mouse leaves in ms. Defaults to 150ms.
  closeDelay?: number;
  // The maximum width of the tooltip. Defaults to 300px.
  maxWidth?: number | string;
  // Lateral buffer distance in pixels around the trigger to prevent early closure
  // Defaults to 15px.
  triggerCloseBuffer?: number;
}

// TODO (pablonoel): move some of these to the theme (the z-index, width)?
const TOOLTIP_Z_INDEX = 9999;
const TOOLTIP_DEFAULT_FADE_DURATION = 100;
const TOOLTIP_DEFAULT_ENTRY_DURATION = 150;
const TOOLTIP_DEFAULT_CLOSE_DELAY = 0;
const TOOLTIP_DEFAULT_TRIGGER_CLOSE_BUFFER = 15;
const TOOLTIP_DEFAULT_MAX_WIDTH = "300px";

/*
 * The visible tooltip box that appears when the user activates
 * the trigger.
 */
const TooltipBox = styled.div<{
  $distance: number;
  $skidding: number;
  $maxWidth: string;
  $placement: TooltipPlacement;
  $visible: boolean;
  $entryDuration: number;
  $transitionMs: number;
  $followCursor: boolean;
}>`
  ${theme.elevation.primary};
  ${theme.radius.tertiary};
  max-width: ${({ $maxWidth }): string => $maxWidth};
  background-color: ${theme.colors.box.tooltip.pill};
  color: ${theme.colors.box.tooltip.text};
  padding: ${theme.spacing.md}px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm}px;
  z-index: ${TOOLTIP_Z_INDEX};
  opacity: ${({ $visible }): number => ($visible ? 1 : 0)};
  pointer-events: ${({ $followCursor }): string =>
    $followCursor ? "none" : "auto"};
  padding: ${theme.spacing.md}px;

  h1,
  h2,
  h3,
  h4,
  h5,
  big {
    padding: 0;
    margin: 0;
    ${theme.typography.family.heading}
    ${theme.typography.text.md}
    font-weight: 600;
  }
  p,
  li {
    padding: 0;
    margin: 0;
    ${theme.typography.family.text}
    ${theme.typography.text.md}
  }

  ${({
    $distance,
    $skidding,
    $placement,
    $visible,
    $entryDuration,
    $transitionMs,
  }): string => {
    let styles = "";
    const popDistance = 5;

    if ($placement.startsWith("top")) {
      styles += `margin-bottom: ${$distance}px;`;
    } else if ($placement.startsWith("bottom")) {
      styles += `margin-top: ${$distance}px;`;
    } else if ($placement.startsWith("left")) {
      styles += `margin-right: ${$distance}px;`;
    } else if ($placement.startsWith("right")) {
      styles += `margin-left: ${$distance}px;`;
    }

    let transformX = 0;
    let transformY = 0;

    if ($skidding !== 0) {
      if ($placement.startsWith("top") || $placement.startsWith("bottom")) {
        transformX = $skidding;
      } else if (
        $placement.startsWith("left") ||
        $placement.startsWith("right")
      ) {
        transformY = $skidding;
      }
    }

    if ($placement.startsWith("top")) {
      transformY += $visible ? 0 : popDistance;
    } else if ($placement.startsWith("bottom")) {
      transformY += $visible ? 0 : -popDistance;
    } else if ($placement.startsWith("left")) {
      transformX += $visible ? 0 : popDistance;
    } else if ($placement.startsWith("right")) {
      transformX += $visible ? 0 : -popDistance;
    }

    styles += `
      transform: translate(${transformX}px, ${transformY}px);
      transition: transform ${$entryDuration}ms ease-out, opacity ${$transitionMs}ms ease-in-out;
    `;

    return styles;
  }}
`;

const isTouchDevice = (): boolean =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

function isTriggerFocusable(child: ReactNode): boolean {
  if (!React.isValidElement(child)) return false;
  const elType = child.type;
  const props = child.props || {};

  if (elType === "button") return true;
  if (elType === "a" && !!props.href) return true;
  return typeof props.tabIndex === "number" && props.tabIndex >= 0;
}

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
  );
};

function mergeHandlers<T extends (...args: any[]) => void>(
  userHandler: T | undefined,
  ourHandler: T
): (...args: Parameters<T>) => void {
  return function merged(...args: Parameters<T>): void {
    if (typeof userHandler === "function") userHandler(...args);
    ourHandler(...args);
  };
}

export const Tooltip = ({
  title,
  children,
  placement,
  followCursor = false,
  disableTouchListener = false,
  skidding,
  distance,
  fadeDuration,
  entryDuration,
  closeDelay,
  maxWidth = TOOLTIP_DEFAULT_MAX_WIDTH,
  triggerCloseBuffer = TOOLTIP_DEFAULT_TRIGGER_CLOSE_BUFFER,
}: TooltipProps): ReactElement => {
  const effectiveFollowCursor = followCursor && !isTouchDevice();
  const effectiveMaxWidth =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  const defaultPlacement: TooltipPlacement = effectiveFollowCursor
    ? "bottom-start"
    : "top";
  const effectivePlacement = placement || defaultPlacement;

  const effectiveSkidding = skidding ?? 0;
  const effectiveDistance = distance ?? 12;
  const effectiveFadeDuration = fadeDuration ?? TOOLTIP_DEFAULT_FADE_DURATION;
  const effectiveEntryDuration =
    entryDuration ?? TOOLTIP_DEFAULT_ENTRY_DURATION;
  const effectiveCloseDelay = closeDelay ?? TOOLTIP_DEFAULT_CLOSE_DELAY;

  const [open, setOpen] = useState(false);
  const [openByTouch, setOpenByTouch] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipBoxRef = useRef<HTMLDivElement | null>(null);

  const {
    x,
    y,
    strategy,
    refs,
    update,
    placement: computedPlacement,
  } = useFloating({
    placement: effectivePlacement,
    middleware: [offset(effectiveDistance), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const mergedFloatingRef = useMergeRefs([tooltipBoxRef, refs.setFloating]);
  const mergedReferenceRef = useMergeRefs([triggerRef, refs.setReference]);

  const clearCloseTimeout = useCallback((): void => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleOpen = useCallback(
    (touch = false): void => {
      clearCloseTimeout();
      setOpen(true);
      if (touch) {
        setOpenByTouch(true);
      }
    },
    [clearCloseTimeout]
  );

  const handleClose = useCallback(
    (touch = false): void => {
      clearCloseTimeout();
      setOpen(false);
      if (touch) {
        setOpenByTouch(false);
      }
    },
    [clearCloseTimeout]
  );

  const handleCloseWithDelay = useCallback((): void => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      handleClose();
      closeTimeoutRef.current = null;
    }, effectiveCloseDelay);
  }, [clearCloseTimeout, effectiveCloseDelay, handleClose]);

  useEffect(() => {
    if (!openByTouch) return;

    const handleDocumentClick = (e: Event): void => {
      const target = e.target as Node;

      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (tooltipBoxRef.current && tooltipBoxRef.current.contains(target))
      ) {
        return;
      }
      handleClose(true);
    };

    document.addEventListener("touchstart", handleDocumentClick);
    return () => {
      document.removeEventListener("touchstart", handleDocumentClick);
    };
  }, [openByTouch, handleClose]);

  const handleMouseEnter = useCallback((): void => {
    if (disableTouchListener && isTouchDevice()) {
      return;
    }
    handleOpen();
  }, [disableTouchListener, handleOpen]);

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (effectiveFollowCursor) {
        refs.setReference({
          getBoundingClientRect() {
            return {
              width: 0,
              height: 0,
              x: e.clientX,
              y: e.clientY,
              top: e.clientY,
              left: e.clientX,
              right: e.clientX,
              bottom: e.clientY,
            };
          },
        });

        void update();
      }
    },
    [effectiveFollowCursor, refs, update]
  );

  const handleTriggerMouseLeave = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (effectiveFollowCursor) {
        handleCloseWithDelay();
        return;
      }

      if (
        refs.floating.current &&
        e.relatedTarget instanceof Node &&
        (refs.floating.current === e.relatedTarget ||
          refs.floating.current.contains(e.relatedTarget))
      ) {
        return;
      }
      handleCloseWithDelay();
    },
    [effectiveFollowCursor, refs.floating, handleCloseWithDelay]
  );

  const handleTooltipMouseLeave = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (
        triggerRef.current &&
        e.relatedTarget instanceof Node &&
        (triggerRef.current === e.relatedTarget ||
          triggerRef.current.contains(e.relatedTarget))
      ) {
        return;
      }
      handleCloseWithDelay();
    },
    [handleCloseWithDelay]
  );

  const handleFocus = useCallback((): void => {
    if (disableTouchListener && isTouchDevice()) return;

    handleOpen();
  }, [disableTouchListener, handleOpen]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (
        refs.floating.current &&
        e.relatedTarget instanceof Node &&
        (refs.floating.current === e.relatedTarget ||
          refs.floating.current.contains(e.relatedTarget))
      ) {
        return;
      }

      if (!openByTouch) {
        handleClose();
      }
    },
    [openByTouch, refs.floating, handleClose]
  );

  const handleTouchStart = useCallback((): void => {
    if (disableTouchListener) return;

    if (openByTouch) {
      handleClose(true);
    } else {
      handleOpen(true);
    }
  }, [disableTouchListener, openByTouch, handleClose, handleOpen]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open) return;

      if (tooltipBoxRef.current) {
        const focusable = getFocusableElements(tooltipBoxRef.current);

        if (e.key === "Tab" && !e.shiftKey) {
          if (focusable.length > 0) {
            e.preventDefault();
            focusable[0].focus();
          }
        } else if (e.key === "Tab" && e.shiftKey) {
          if (focusable.length > 0) {
            e.preventDefault();
            focusable[focusable.length - 1].focus();
          }
        }
      }
    },
    [open]
  );

  const handleTooltipKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!tooltipBoxRef.current) return;

      const focusable = getFocusableElements(tooltipBoxRef.current);
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          handleClose();

          const allFocusable = getFocusableElements(document.body);
          const triggerIndex = allFocusable.indexOf(
            triggerRef.current as HTMLElement
          );

          if (triggerIndex > 0) {
            allFocusable[triggerIndex - 1].focus();
          } else {
            (document.activeElement as HTMLElement).blur();
          }
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          handleClose();

          const allFocusable = getFocusableElements(document.body);
          const triggerIndex = allFocusable.indexOf(
            triggerRef.current as HTMLElement
          );

          if (triggerIndex >= 0 && triggerIndex < allFocusable.length - 1) {
            const nextElement = allFocusable[triggerIndex + 1];
            nextElement.focus();
          } else {
            (document.activeElement as HTMLElement).blur();
          }
        }
      }
    },
    [handleClose]
  );

  useEffect(() => {
    if (!open || effectiveFollowCursor) return;

    function onMouseMove(e: globalThis.MouseEvent): void {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        tooltipBoxRef.current?.contains(e.target as Node)
      ) {
        clearCloseTimeout();
        return;
      }

      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const tooltipRect = tooltipBoxRef.current?.getBoundingClientRect();
      if (!triggerRect || !tooltipRect) return;

      const triggerWithBuffer = {
        left: triggerRect.left,
        right: triggerRect.right,
        top: triggerRect.top,
        bottom: triggerRect.bottom,
      };

      if (
        computedPlacement.startsWith("top") ||
        computedPlacement.startsWith("bottom")
      ) {
        triggerWithBuffer.left -= triggerCloseBuffer;
        triggerWithBuffer.right += triggerCloseBuffer;
      } else if (
        computedPlacement.startsWith("left") ||
        computedPlacement.startsWith("right")
      ) {
        triggerWithBuffer.top -= triggerCloseBuffer;
        triggerWithBuffer.bottom += triggerCloseBuffer;
      }

      let [bridgeWidth, bridgeHeight, bridgeLeft, bridgeTop] = [0, 0, 0, 0];

      if (
        computedPlacement.startsWith("top") ||
        computedPlacement.startsWith("bottom")
      ) {
        bridgeWidth = Math.max(triggerRect.width, tooltipRect.width);
        bridgeLeft =
          Math.min(triggerRect.left, tooltipRect.left) -
          Math.abs(
            bridgeWidth - Math.max(triggerRect.width, tooltipRect.width)
          ) /
            2;
      } else {
        bridgeHeight = Math.max(triggerRect.height, tooltipRect.height);
        bridgeTop =
          Math.min(triggerRect.top, tooltipRect.top) -
          Math.abs(
            bridgeHeight - Math.max(triggerRect.height, tooltipRect.height)
          ) /
            2;
      }

      const inTriggerBuffer =
        e.clientX >= triggerWithBuffer.left &&
        e.clientX <= triggerWithBuffer.right &&
        e.clientY >= triggerWithBuffer.top &&
        e.clientY <= triggerWithBuffer.bottom;

      let inBridgeArea = false;

      if (computedPlacement.startsWith("top")) {
        inBridgeArea =
          e.clientX >= bridgeLeft &&
          e.clientX <= bridgeLeft + bridgeWidth &&
          e.clientY >= tooltipRect.bottom &&
          e.clientY <= triggerRect.top;
      } else if (computedPlacement.startsWith("bottom")) {
        inBridgeArea =
          e.clientX >= bridgeLeft &&
          e.clientX <= bridgeLeft + bridgeWidth &&
          e.clientY >= triggerRect.bottom &&
          e.clientY <= tooltipRect.top;
      } else if (computedPlacement.startsWith("left")) {
        inBridgeArea =
          e.clientY >= bridgeTop &&
          e.clientY <= bridgeTop + bridgeHeight &&
          e.clientX >= tooltipRect.right &&
          e.clientX <= triggerRect.left;
      } else if (computedPlacement.startsWith("right")) {
        inBridgeArea =
          e.clientY >= bridgeTop &&
          e.clientY <= bridgeTop + bridgeHeight &&
          e.clientX >= triggerRect.right &&
          e.clientX <= tooltipRect.left;
      }

      if (inTriggerBuffer || inBridgeArea) {
        clearCloseTimeout();
      } else {
        handleCloseWithDelay();
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [
    open,
    computedPlacement,
    handleCloseWithDelay,
    clearCloseTimeout,
    triggerCloseBuffer,
    effectiveFollowCursor,
  ]);

  const triggerChild = React.Children.only(children) as ReactElement;

  let triggerNode: ReactElement;
  if (isTriggerFocusable(triggerChild)) {
    triggerNode = React.cloneElement(triggerChild, {
      ref: mergedReferenceRef,
      onMouseEnter: mergeHandlers(
        triggerChild.props.onMouseEnter,
        handleMouseEnter
      ),
      onMouseMove: mergeHandlers(
        triggerChild.props.onMouseMove,
        handleMouseMove
      ),
      onMouseLeave: mergeHandlers(
        triggerChild.props.onMouseLeave,
        handleTriggerMouseLeave
      ),
      onFocus: mergeHandlers(triggerChild.props.onFocus, handleFocus),
      onBlur: mergeHandlers(triggerChild.props.onBlur, handleBlur),
      onTouchStart: mergeHandlers(
        triggerChild.props.onTouchStart,
        handleTouchStart
      ),
      onKeyDown: mergeHandlers(
        triggerChild.props.onKeyDown,
        handleTriggerKeyDown
      ),
    });
  } else {
    triggerNode = (
      <div
        ref={mergedReferenceRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleTriggerMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onTouchStart={handleTouchStart}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={0}
      >
        {triggerChild}
      </div>
    );
  }

  return (
    <>
      {triggerNode}

      <FloatingPortal>
        <TooltipBox
          ref={mergedFloatingRef}
          role="tooltip"
          onKeyDown={handleTooltipKeyDown}
          onMouseLeave={handleTooltipMouseLeave}
          $distance={effectiveDistance}
          $skidding={effectiveSkidding}
          $maxWidth={effectiveMaxWidth}
          $placement={computedPlacement}
          $visible={open}
          $entryDuration={effectiveEntryDuration}
          $transitionMs={effectiveFadeDuration}
          $followCursor={effectiveFollowCursor}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            display: "block",
            pointerEvents: open ? "auto" : "none",
          }}
        >
          {title}
        </TooltipBox>
      </FloatingPortal>
    </>
  );
};
