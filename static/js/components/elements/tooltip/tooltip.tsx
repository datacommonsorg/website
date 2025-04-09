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
  MouseEvent,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import theme from "../../../theme/theme";

//options are: top, top-start, top-end, right, right-start, right-end, bottom, bottom-start, bottom-end, left, left-start, and left-end
type TooltipPlacement = Placement;

/*
 The interface for the tooltip component.
 */
interface TooltipProps {
  //The content of the tooltip itself. This can be a string or ReactNode.
  title: ReactNode;
  //The trigger of the tooltip. This can be any ReactNode.
  children: ReactNode;
  //Placement of the tooltip relative to the trigger. It will self-adjust
  //if no room. Default is 'bottom-start' when followCursor is
  //true, else 'top'.
  placement?: TooltipPlacement;
  //The tooltip follows the mouse cursor if true. Default false.
  followCursor?: boolean;
  //Touch events do not open the tooltip if true. Default false.
  //This can be used to suppress touch opening the tooltip when
  //the tooltip is an action.
  disableTouchListener?: boolean;
  //Skidding along the axis of the placement (movement laterally - not away from tooltip)
  skidding?: number;
  //Distance in the perpendicular axis of the placement (away from tooltip)
  distance?: number;
  //Fade transition duration in ms. Defaults to 100ms.
  fadeDuration?: number;
  //Entry animation duration in ms. Defaults to 150ms.
  entryDuration?: number;
  //The maximum width of the tooltip. Defaults to 300px.
  maxWidth?: number | string;
}

//TODO (pablonoel): move these to the theme?
const TOOLTIP_Z_INDEX = 9999;
const TOOLTIP_DEFAULT_FADE_DURATION = 100;
const TOOLTIP_DEFAULT_ENTRY_DURATION = 150;
const TOOLTIP_DEFAULT_MAX_WIDTH = "300px";

/*
 * The container for the tooltip itself. Note that this is not the visible tooltip
 * box (which will be inside this container). It is a transparent container that
 * always touches the trigger so that the mouse can pass between the trigger and
 * the tooltip box without losing the tooltip.
 */
const TooltipContainer = styled.div<{
  $visible: boolean;
  $transitionMs: number;
  $followCursor: boolean;
}>`
  z-index: ${TOOLTIP_Z_INDEX};
  background-color: transparent;
  opacity: ${({ $visible }): number => ($visible ? 1 : 0)};
  transition: opacity ${({ $transitionMs }): number => $transitionMs}ms
    ease-in-out;
  pointer-events: ${({ $followCursor }): string =>
    $followCursor ? "none" : "auto"};
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
`;

const TooltipBox = styled.div<{
  $distance: number;
  $skidding: number;
  $maxWidth: string;
  $placement: TooltipPlacement;
  $visible: boolean;
  $entryDuration: number;
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
      transition: transform ${$entryDuration}ms ease-out;
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
  maxWidth = TOOLTIP_DEFAULT_MAX_WIDTH,
}: TooltipProps): ReactElement => {
  const effectiveFollowCursor = followCursor && !isTouchDevice();
  const effectiveMaxWidth =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  const defaultPlacement: TooltipPlacement = effectiveFollowCursor
    ? "bottom-start"
    : "top";
  const effectivePlacement = placement || defaultPlacement;

  const effectiveSkidding = skidding ?? 0;
  const effectiveDistance = distance ?? (effectiveFollowCursor ? 16 : 12);
  const effectiveFadeDuration = fadeDuration ?? TOOLTIP_DEFAULT_FADE_DURATION;
  const effectiveEntryDuration =
    entryDuration ?? TOOLTIP_DEFAULT_ENTRY_DURATION;

  const [open, setOpen] = useState(false);
  const [openByTouch, setOpenByTouch] = useState(false);

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
    middleware: [
      ...(effectiveFollowCursor ? [offset(effectiveDistance)] : []),
      flip(),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  const mergedReferenceRef = useMergeRefs([triggerRef, refs.setReference]);

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

      setOpen(false);
      setOpenByTouch(false);
    };

    document.addEventListener("touchstart", handleDocumentClick);

    return () => {
      document.removeEventListener("touchstart", handleDocumentClick);
    };
  }, [openByTouch]);

  const handleMouseEnter = useCallback(() => {
    if (disableTouchListener && isTouchDevice()) {
      return;
    }
    setOpen(true);
  }, [disableTouchListener]);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
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
    (e: MouseEvent<HTMLDivElement>) => {
      if (effectiveFollowCursor) {
        setOpen(false);
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

      setOpen(false);
    },
    [effectiveFollowCursor, refs.floating]
  );

  const handleTooltipMouseLeave = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (
        triggerRef.current &&
        e.relatedTarget instanceof Node &&
        (triggerRef.current === e.relatedTarget ||
          triggerRef.current.contains(e.relatedTarget))
      ) {
        return;
      }

      setOpen(false);
    },
    [triggerRef]
  );

  const handleFocus = useCallback(() => {
    if (disableTouchListener && isTouchDevice()) return;

    setOpen(true);
  }, [disableTouchListener]);

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
        setOpen(false);
      }
    },
    [openByTouch, refs.floating]
  );

  const handleTouchStart = useCallback(() => {
    if (disableTouchListener) return;

    if (openByTouch) {
      setOpen(false);
      setOpenByTouch(false);
    } else {
      setOpen(true);
      setOpenByTouch(true);
    }
  }, [disableTouchListener, openByTouch]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open) return;

      if (e.key === "Tab" && !e.shiftKey) {
        if (tooltipBoxRef.current) {
          const focusable = getFocusableElements(tooltipBoxRef.current);
          if (focusable.length > 0) {
            e.preventDefault();
            focusable[0].focus();
          }
        }
      } else if (e.key === "Tab" && e.shiftKey) {
        if (tooltipBoxRef.current) {
          const focusable = getFocusableElements(tooltipBoxRef.current);
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
          setOpen(false);

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
          setOpen(false);

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
    []
  );

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
        <TooltipContainer
          ref={refs.setFloating}
          $visible={open}
          $transitionMs={effectiveFadeDuration}
          $followCursor={effectiveFollowCursor}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            display: "block",
            pointerEvents: open ? "auto" : "none",
          }}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <TooltipBox
            ref={tooltipBoxRef}
            role="tooltip"
            onKeyDown={handleTooltipKeyDown}
            $distance={effectiveDistance}
            $skidding={effectiveSkidding}
            $maxWidth={effectiveMaxWidth}
            $placement={computedPlacement}
            $visible={open}
            $entryDuration={effectiveEntryDuration}
          >
            {title}
          </TooltipBox>
        </TooltipContainer>
      </FloatingPortal>
    </>
  );
};
