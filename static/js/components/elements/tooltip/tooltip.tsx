import styled from "@emotion/styled";
import type { Placement } from "@floating-ui/react";
import { arrow, FloatingArrow } from "@floating-ui/react";
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
  // Mode of the tooltip: 'tooltip' or 'popover'. Defaults to 'tooltip'.
  // In 'tooltip' mode, it behaves as a tooltip on desktop and popover in touch mode.
  // In 'popover' mode, it behaves like a popover in both touch and non-touch mode.
  mode?: "tooltip" | "popover";
  // The placement of the cursor relative to the trigger. Default "top".
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
  // Entry and exit animation duration in ms. Defaults to 150ms.
  animationDuration?: number;
  // Distance of animation in pixels. Defaults to 5px.
  animationDistance?: number;
  // Delay before closing the tooltip when the mouse leaves in ms. Defaults to 150ms.
  closeDelay?: number;
  // The maximum width of the tooltip. Defaults to 300px.
  maxWidth?: number | string;
  // Lateral buffer distance in pixels around the trigger to prevent early closure
  // Defaults to 10px.
  triggerBuffer?: number;
}

// TODO (pablonoel): move some of these to the theme (the z-index, width)?
const TOOLTIP_Z_INDEX = 9999;
const TOOLTIP_DEFAULT_DISTANCE = 12;
const TOOLTIP_DEFAULT_FOLLOW_CURSOR_DISTANCE = 20;
const TOOLTIP_DEFAULT_SKIDDING = 0;
const TOOLTIP_DEFAULT_FOLLOW_CURSOR_SKIDDING = -15;
const TOOLTIP_DEFAULT_FADE_DURATION = 100;
const TOOLTIP_DEFAULT_ANIMATION_DURATION = 150;
const TOOLTIP_DEFAULT_ANIMATION_DISTANCE = 5;
const TOOLTIP_DEFAULT_CLOSE_DELAY = 0;
const TOOLTIP_DEFAULT_TRIGGER_BUFFER = 10;
const TOOLTIP_DEFAULT_MAX_WIDTH = "300px";

/*
 * The visible tooltip box that appears when the user activates
 * the trigger.
 */
const TooltipBox = styled.div<{
  $maxWidth: string;
  $placement: TooltipPlacement;
  $visible: boolean;
  $animationDuration: number;
  $fadeDuration: number;
  $followCursor: boolean;
  $animationDistance: number;
  $isTouch: boolean;
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
    $placement,
    $visible,
    $animationDuration,
    $fadeDuration,
    $animationDistance,
    $followCursor,
    $isTouch,
  }): string => {
    let transformX = 0;
    let transformY = 0;

    const shouldAnimate = !$followCursor && !$isTouch;

    if (shouldAnimate) {
      if ($placement.startsWith("top")) {
        transformY += $visible ? 0 : $animationDistance;
      } else if ($placement.startsWith("bottom")) {
        transformY += $visible ? 0 : -$animationDistance;
      } else if ($placement.startsWith("left")) {
        transformX += $visible ? 0 : $animationDistance;
      } else if ($placement.startsWith("right")) {
        transformX += $visible ? 0 : -$animationDistance;
      }
    }

    return `
      transform: translate(${transformX}px, ${transformY}px);
      transition: ${
        shouldAnimate ? `transform ${$animationDuration}ms ease-out, ` : ""
      }opacity ${$fadeDuration}ms ease-in-out;
    `;
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
  mode = "tooltip",
  placement,
  followCursor = false,
  disableTouchListener = false,
  skidding,
  distance,
  fadeDuration,
  animationDuration,
  animationDistance,
  closeDelay,
  maxWidth = TOOLTIP_DEFAULT_MAX_WIDTH,
  triggerBuffer = TOOLTIP_DEFAULT_TRIGGER_BUFFER,
}: TooltipProps): ReactElement => {
  const popoverMode = mode === "popover";

  const isTouch = isTouchDevice();
  const effectiveFollowCursor = followCursor && !isTouch && !popoverMode;
  const effectiveMaxWidth =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  const defaultPlacement: TooltipPlacement = effectiveFollowCursor
    ? "bottom-start"
    : "top";
  const effectivePlacement = placement || defaultPlacement;

  const effectiveSkidding =
    skidding ?? followCursor
      ? TOOLTIP_DEFAULT_FOLLOW_CURSOR_SKIDDING
      : TOOLTIP_DEFAULT_SKIDDING;
  const effectiveDistance =
    distance ?? followCursor
      ? TOOLTIP_DEFAULT_FOLLOW_CURSOR_DISTANCE
      : TOOLTIP_DEFAULT_DISTANCE;
  const effectiveFadeDuration = fadeDuration ?? TOOLTIP_DEFAULT_FADE_DURATION;
  const effectiveAnimationDuration =
    animationDuration ?? TOOLTIP_DEFAULT_ANIMATION_DURATION;
  const effectiveAnimationDistance =
    animationDistance ?? TOOLTIP_DEFAULT_ANIMATION_DISTANCE;
  const effectiveCloseDelay = closeDelay ?? TOOLTIP_DEFAULT_CLOSE_DELAY;

  const [open, setOpen] = useState(false);
  const [openByTouch, setOpenByTouch] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipBoxRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef(null);

  const {
    x,
    y,
    strategy,
    refs,
    context,
    placement: computedPlacement,
    update,
  } = useFloating({
    placement: effectivePlacement,
    middleware: [
      offset({
        mainAxis: effectiveDistance,
        crossAxis: effectiveSkidding,
      }),
      flip(),
      shift(),
      arrow({ element: arrowRef }),
    ],
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
    if (disableTouchListener && isTouch) {
      return;
    }
    if (!popoverMode) {
      handleOpen();
    }
  }, [disableTouchListener, isTouch, popoverMode, handleOpen]);

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
      if (popoverMode) return;

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
    [popoverMode, effectiveFollowCursor, refs.floating, handleCloseWithDelay]
  );

  const handleTooltipMouseLeave = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (popoverMode) return;

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
    [popoverMode, handleCloseWithDelay]
  );

  const handleFocus = useCallback((): void => {
    if (disableTouchListener && isTouch) return;

    if (!popoverMode) {
      handleOpen();
    }
  }, [disableTouchListener, isTouch, popoverMode, handleOpen]);

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

      if (!openByTouch && !popoverMode) {
        handleClose();
      }
    },
    [openByTouch, popoverMode, refs.floating, handleClose]
  );

  const handleTouchStart = useCallback((): void => {
    if (disableTouchListener) return;

    if (openByTouch) {
      handleClose(true);
    } else {
      handleOpen(true);
    }
  }, [disableTouchListener, openByTouch, handleClose, handleOpen]);

  const handleClick = useCallback((): void => {
    if (!popoverMode || isTouch) return;
    open ? handleClose(true) : handleOpen(true);
  }, [popoverMode, isTouch, open, handleClose, handleOpen]);

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
        triggerWithBuffer.left -= triggerBuffer;
        triggerWithBuffer.right += triggerBuffer;
      } else if (
        computedPlacement.startsWith("left") ||
        computedPlacement.startsWith("right")
      ) {
        triggerWithBuffer.top -= triggerBuffer;
        triggerWithBuffer.bottom += triggerBuffer;
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
    triggerBuffer,
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
      onClick: mergeHandlers(triggerChild.props.onClick, handleClick),
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
        onClick={handleClick}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={0}
        style={{ cursor: popoverMode ? "pointer" : "inherit" }}
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
          $maxWidth={effectiveMaxWidth}
          $placement={computedPlacement}
          $visible={open}
          $animationDuration={effectiveAnimationDuration}
          $fadeDuration={effectiveFadeDuration}
          $followCursor={effectiveFollowCursor}
          $animationDistance={effectiveAnimationDistance}
          $isTouch={isTouch}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            display: "block",
            pointerEvents: open ? "auto" : "none",
          }}
        >
          {title}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            fill={theme.colors.box.tooltip.pill}
            stroke={"hsla(0, 0%, 0%, 0.2)"}
            strokeWidth={1}
            staticOffset={followCursor ? "5%" : 0}
          />
        </TooltipBox>
      </FloatingPortal>
    </>
  );
};
