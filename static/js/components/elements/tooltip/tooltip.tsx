/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A full-featured tooltip and popover component.
 *
 * This component provides tooltip and popover functionality.
 *
 * It can accept both simple strings or complex React nodes
 * for both the tooltip trigger and the tooltip content.
 *
 * By default:
 * - On desktop devices: behaves as a standard tooltip that appears
 *   on hover
 * - On touch devices (standard): behaves as a popover that appears on
 *   tap and includes a close button
 * - On touch devices (action): if a tooltip trigger contains a primary
 *   click action (it is a button, a link or contains a click event),
 *   then on touch screens, this will be rendered as a standard tooltip
 *   that opens on a long press.
 *
 * The touch screen's long press defaults can be overridden by
 * explicit use of the `triggerTouchOnLongPress` prop (by which you can turn
 * long press interaction on for a regular tooltip or off for a primary action
 * tooltip). While this is possible to do, the default functionality is recommended
 * unless there is a very specific use-case.
 *
 * The component can be explicitly set to "popover" mode, thereby
 * behaving as a popover on all devices.
 *
 * The tooltips can contain interactive elements such as links or buttons.
 * The user will be able to interact with those elements with either
 * the mouse or the keyboard in both tooltip and popover mode.
 *
 * Difference between tooltip and popover:
 * - Tooltip: appears on hover and disappears when hover ends
 * - Popover: made visible explicitly by clicking or <enter>. Remains
 *   open until the popover is dismissed.
 *
 * Note that an exception to the interactivity of the tooltip is when
 * the tooltip is in "followCursor" mode, as by design the mouse can
 * never enter the tooltip.
 *
 * Descriptions of the options available can be found in the comments
 * annotating the interface for the tooltip.
 *
 * Some example usages of the tooltip:
 *
 * // Basic tooltip with text trigger and text content
 * <Tooltip title="A simple tooltip, text trigger, text content">
 *   Text Trigger
 * </Tooltip>
 *
 * // Basic tooltip with text trigger and text content
 * <Tooltip title="A simple tooltip with an arrow" showArrow>
 *   Text Trigger
 * </Tooltip>
 *
 * // Tooltip with button trigger
 * // Touch tooltips are set to trigger on long press as the button has its own action
 * <Tooltip
 *   title="This is a button"
 * >
 *   <button onClick={(): void => console.log("click")}>
 *     Hover me
 *   </button>
 * </Tooltip>
 *
 * // Tooltip with rich content that follows cursor.
 * // as well as an icon trigger and an arrow.
 * <Tooltip
 *   title={
 *     <>
 *       <h2>Follow Cursor</h2>
 *       <p>This tooltip follows the cursor.</p>
 *     </>
 *   }
 *   followCursor
 *   showArrow
 * >
 *   <InfoSpark />
 * </Tooltip>
 *
 * // Tooltip with rich content and custom placement
 * <Tooltip
 *   title={
 *     <>
 *       <h2>Another icon tooltip</h2>
 *       <p>
 *         <em>This cursor is to the left.</em>
 *         <br />
 *         <a href={"https://google.com"}>
 *           A link that can be clicked in both mobile and not.
 *         </a>
 *       </p>
 *     </>
 *   }
 *   placement="left"
 *   showArrow
 * >
 *   <ScatterPlot />
 * </Tooltip>
 *
 * // "Popover" mode, meaning tooltips are treated as popovers
 * // even in desktop.
 * <Tooltip
 *   title={
 *     <>
 *       <h1>Popover</h1>
 *       <p>
 *         This is always a popover
 *         <br />
 *         <a href={"https://google.com"}>
 *           A link that can be clicked in both mobile and desktop.
 *         </a>
 *       </p>
 *     </>
 *   }
 *   mode="popover"
 * >
 *   <InfoSpark />
 * </Tooltip>
 */

/** @jsxImportSource @emotion/react */

import { Theme } from "@emotion/react";
import styled, { Interpolation } from "@emotion/styled";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingArrowProps,
  FloatingPortal,
  offset,
  Placement,
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

import { useUniqueId } from "../../../shared/hooks/unique_id";
import theme from "../../../theme/theme";
import { Close } from "../icons/close";
import { tooltipBus, TooltipCallback } from "./tooltip_bus";

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
  // wrapper for the tooltip trigger if the trigger is not already focusable.
  // Defaults to a "span", which is safe for inline usage
  wrapperComponent?: React.ElementType;
  // The tooltip follows the mouse cursor if true. Default false.
  followCursor?: boolean;
  // Whether to show the arrow. Defaults to false.
  showArrow?: boolean;
  // If true, the tooltip will only open on touch devices via a long press.
  // This is useful when the trigger element has its own primary click action.
  // This should not be combined with disableTouchListener. If both are set,
  // touch will not open the tooltip.
  triggerTouchOnLongPress?: boolean;
  // The delay in ms to wait for a long press. Defaults to 500ms.
  longPressDelay?: number;
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
  // Custom HTML cursors can be used, default will inherit the styles of the element or
  // pointer in the case of popovers
  cursor?: string;
  // Prop to allow the optional overriding of tooltip box CSS.
  boxCss?: Interpolation<Theme>;
  // Prop to allow the optional overriding of tooltip trigger CSS.
  triggerCss?: Interpolation<Theme>;
  // Prop to allow the optional overriding of the arrow styles.
  arrowProps?: Omit<FloatingArrowProps, "ref" | "context">;
}

const TOOLTIP_Z_INDEX = theme.zIndex.tooltip;
const TOOLTIP_DEFAULT_MAX_WIDTH = theme.tooltip.width;
const TOOLTIP_DEFAULT_DISTANCE = 15;
const TOOLTIP_DEFAULT_FOLLOW_CURSOR_DISTANCE = 25;
const TOOLTIP_DEFAULT_SKIDDING = 0;
const TOOLTIP_DEFAULT_FOLLOW_CURSOR_SKIDDING = 0;
const TOOLTIP_DEFAULT_FADE_DURATION = 100;
const TOOLTIP_DEFAULT_ANIMATION_DURATION = 150;
const TOOLTIP_DEFAULT_ANIMATION_DISTANCE = 5;
const TOOLTIP_DEFAULT_CLOSE_DELAY = 0;
const TOOLTIP_DEFAULT_TRIGGER_BUFFER = 10;
const TOOLTIP_DEFAULT_LONG_PRESS_DELAY = 500;

/**
 * The tooltip box that appears when the user activates
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
  $openAsPopover: boolean;
  $showArrow: boolean;
}>`
  ${theme.typography.family.text}
  ${theme.typography.text.sm}
  ${theme.elevation.primary};
  max-width: ${({ $maxWidth }): string => $maxWidth};
  background-color: ${theme.colors.box.tooltip.pill};
  color: ${theme.colors.box.tooltip.text};
  padding: ${theme.spacing.md}px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm}px;
  opacity: ${({ $visible }): number => ($visible ? 1 : 0)};
  pointer-events: ${({ $followCursor }): string =>
    $followCursor ? "none" : "auto"};
  z-index: ${TOOLTIP_Z_INDEX};
  opacity: ${({ $visible }): number => ($visible ? 1 : 0)};
  pointer-events: ${({ $followCursor }): string =>
    $followCursor ? "none" : "auto"};
  padding: ${({ $openAsPopover }): string => `${theme.spacing.md}px
    ${$openAsPopover ? theme.spacing.lg : theme.spacing.md}px
    ${theme.spacing.md}px ${theme.spacing.md}px `};

  ${({ $placement, $showArrow }): string | { borderRadius: string } => {
    if (!$showArrow) {
      return theme.radius.tertiary;
    }
    const baseRadius = theme.radius.tertiary.borderRadius;
    const placementRules = [
      { prefix: "top-start", rule: "border-bottom-left-radius: 0px;" },
      { prefix: "top-end", rule: "border-bottom-right-radius: 0px;" },
      { prefix: "bottom-start", rule: "border-top-left-radius: 0px;" },
      { prefix: "bottom-end", rule: "border-top-right-radius: 0px;" },
      { prefix: "left-start", rule: "border-top-right-radius: 0px;" },
      { prefix: "left-end", rule: "border-bottom-right-radius: 0px;" },
      { prefix: "right-start", rule: "border-top-left-radius: 0px;" },
      { prefix: "right-end", rule: "border-bottom-left-radius: 0px;" },
    ];
    const match = placementRules.find(({ prefix }) =>
      $placement.startsWith(prefix)
    );
    if (match) {
      return `
        border-radius: ${baseRadius};
        ${match.rule}
      `;
    }
    return theme.radius.tertiary;
  }}

  ${theme.typography.family.text}
  ${theme.typography.text.sm}
  white-space: pre-wrap;
  word-break: break-word;
  h1,
  h2,
  h3,
  h4,
  h5,
  big {
    padding: 0;
    margin: 0;
    ${theme.typography.family.heading}
    ${theme.typography.text.sm}
    font-weight: 600;
    white-space: pre-wrap;
    word-break: break-word;
  }
  p,
  li {
    padding: 0;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  ${({
    $placement,
    $visible,
    $animationDuration,
    $fadeDuration,
    $animationDistance,
    $followCursor,
    $openAsPopover,
  }): string => {
    let transformX = 0;
    let transformY = 0;

    const shouldAnimate = !$followCursor && !$openAsPopover;

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

/**
 * The close button at the top-right of popovers
 */
const CloseButton = styled.button`
  position: absolute;
  margin: 0;
  padding: 0;
  display: block;
  top: 5px;
  right: 5px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${theme.colors.box.tooltip.text};
  &:hover {
    color: ${theme.colors.link.primary.base};
  }
`;

/**
 * A styled wrapper around simple string triggers.
 */
const SimpleStringTrigger = styled.span<{
  $cursor: string;
}>`
  display: inline-block;
  padding: 0;
  margin: 0;
  text-decoration: underline ${theme.colors.box.tooltip.text} dashed;
  cursor: ${({ $cursor }): string => ($cursor ? $cursor : "inherit")};
`;

/*
 * Tooltip Helper Functions
 */

const isTouchDevice = (): boolean =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

/**
 * Check if the trigger element focusable in itself (if not, we
 * will wrap it in a focusable element).
 */
function isTriggerFocusable(child: ReactNode): boolean {
  if (!React.isValidElement(child)) return false;
  const elType = child.type;
  const props = child.props || {};

  if (elType === "button") return true;
  if (elType === "a" && !!props.href) return true;
  return typeof props.tabIndex === "number" && props.tabIndex >= 0;
}

/**
 * Check if the trigger element is an "action" element, meaning it has
 * a primary click behavior (like a button, link, or has an onClick).
 */
function isActionTrigger(child: React.ReactElement): boolean {
  const props = child.props || {};

  if (child.type === "button") {
    return true;
  }

  if (child.type === "a" && !!props.href) {
    return true;
  }

  return !!props.onClick;
}

/**
 * Gets all focusable elements in a node (used for managing tabbing into
 * the tooltip)
 */
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      !el.getAttribute("aria-hidden") &&
      el.tabIndex !== -1
  );
};

/**
 * If the trigger element sent is focusable (see above function) then
 * we will not wrap it, and instead merge the tooltip handlers into it
 */
function mergeHandlers<T extends (...args: unknown[]) => void>(
  userHandler: T | undefined,
  ourHandler: T
): (...args: Parameters<T>) => void {
  return function merged(...args: Parameters<T>): void {
    if (typeof userHandler === "function") userHandler(...args);
    ourHandler(...args);
  };
}

/**
 * Creates a lateral buffer around the tooltip trigger
 * to increase the area the cursor can move.
 */
function addLateralTriggerBuffer(
  rect: DOMRect,
  buffer: number,
  direction: string
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const result = {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
  };

  if (direction.startsWith("top") || direction.startsWith("bottom")) {
    result.left -= buffer;
    result.right += buffer;
  } else if (direction.startsWith("left") || direction.startsWith("right")) {
    result.top -= buffer;
    result.bottom += buffer;
  }

  return result;
}

/**
 * Calculates the safe area that includes the tooltip and the
 * bridge between the tooltip and the trigger.
 * Used to prevent the tooltip from closing when the cursor travels
 * from the trigger to the tooltip.
 */
function calculateSafeArea(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: string
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const result = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  if (placement.startsWith("top")) {
    result.left = Math.min(tooltipRect.left, triggerRect.left);
    result.right = Math.max(tooltipRect.right, triggerRect.right);
    result.top = tooltipRect.top;
    result.bottom = triggerRect.top;
  } else if (placement.startsWith("bottom")) {
    result.left = Math.min(tooltipRect.left, triggerRect.left);
    result.right = Math.max(tooltipRect.right, triggerRect.right);
    result.top = triggerRect.bottom;
    result.bottom = tooltipRect.bottom;
  } else if (placement.startsWith("left")) {
    result.left = tooltipRect.left;
    result.right = triggerRect.left;
    result.top = Math.min(tooltipRect.top, triggerRect.top);
    result.bottom = Math.max(tooltipRect.bottom, triggerRect.bottom);
  } else if (placement.startsWith("right")) {
    result.left = triggerRect.right;
    result.right = tooltipRect.right;
    result.top = Math.min(tooltipRect.top, triggerRect.top);
    result.bottom = Math.max(tooltipRect.bottom, triggerRect.bottom);
  } else {
    result.left = Math.min(tooltipRect.left, triggerRect.left);
    result.right = Math.max(tooltipRect.right, triggerRect.right);
    result.top = Math.min(tooltipRect.top, triggerRect.top);
    result.bottom = Math.max(tooltipRect.bottom, triggerRect.bottom);
  }

  return result;
}

/**
 * Checks if a point is inside an area
 */
function isPointInArea(
  x: number,
  y: number,
  area: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }
): boolean {
  return x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
}

/**
 * Checks the cursor is in the safe zone (including the bridge zone and tooltip).
 */
function cursorInSafeZone(
  e: MouseEvent,
  triggerRef: React.RefObject<HTMLDivElement>,
  tooltipBoxRef: React.RefObject<HTMLDivElement>,
  placement: string,
  triggerBuffer: number
): boolean {
  if (
    triggerRef.current?.contains(e.target as Node) ||
    tooltipBoxRef.current?.contains(e.target as Node)
  ) {
    return true;
  }

  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const tooltipRect = tooltipBoxRef.current?.getBoundingClientRect();
  if (!triggerRect || !tooltipRect) return false;

  const triggerWithBuffer = addLateralTriggerBuffer(
    triggerRect,
    triggerBuffer,
    placement
  );

  const safeArea = calculateSafeArea(triggerRect, tooltipRect, placement);

  const { clientX, clientY } = e;
  if (isPointInArea(clientX, clientY, triggerWithBuffer)) {
    return true;
  }
  return isPointInArea(clientX, clientY, safeArea);
}

/**
 * Creates the trigger node selectively depending on the nature of the
 * trigger send into the tooltip via the children.
 */
function createTriggerNode({
  children,
  cursor,
  popoverMode,
  wrapperComponent,
  triggerRef,
  handlePointerEnter,
  handleMouseMove,
  handleTriggerPointerLeave,
  handleFocus,
  handleBlur,
  handleTouchStart,
  handleClick,
  handleTouchMove,
  handleTouchEnd,
  handleContextMenu,
  handleTriggerKeyDown,
  triggerTouchOnLongPress,
  triggerCss,
}: {
  children: ReactNode;
  cursor?: string;
  popoverMode: boolean;
  wrapperComponent?: React.ElementType;
  triggerRef: (node: HTMLDivElement | null) => void;
  handlePointerEnter: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: ReactMouseEvent<HTMLDivElement>) => void;
  handleTriggerPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleFocus: () => void;
  handleBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
  handleTouchStart: () => void;
  handleClick: () => void;
  handleTouchMove: () => void;
  handleTouchEnd: () => void;
  handleContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => void;
  handleTriggerKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  triggerTouchOnLongPress: boolean;
  triggerCss?: Interpolation<Theme>;
}): ReactElement {
  // these long press styles prevent clashing mobile behavior when the user holds a sustained press.
  const longPressStyles = triggerTouchOnLongPress
    ? {
        WebkitTouchCallout: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }
    : {};

  let triggerChild: ReactElement;

  if (typeof children === "string" || typeof children === "number") {
    triggerChild = (
      <SimpleStringTrigger $cursor={cursor || "inherit"}>
        {children}
      </SimpleStringTrigger>
    );
  } else {
    triggerChild = React.Children.only(children) as ReactElement;
  }

  if (isTriggerFocusable(triggerChild)) {
    return React.cloneElement(triggerChild, {
      ref: triggerRef,
      css: [longPressStyles, triggerCss],
      onPointerEnter: mergeHandlers(
        triggerChild.props.onPointerEnter,
        handlePointerEnter
      ),
      onMouseMove: mergeHandlers(
        triggerChild.props.onMouseMove,
        handleMouseMove
      ),
      onPointerLeave: mergeHandlers(
        triggerChild.props.onPointerLeave,
        handleTriggerPointerLeave
      ),
      onFocus: mergeHandlers(triggerChild.props.onFocus, handleFocus),
      onBlur: mergeHandlers(triggerChild.props.onBlur, handleBlur),
      onTouchStart: mergeHandlers(
        triggerChild.props.onTouchStart,
        handleTouchStart
      ),
      onTouchMove: mergeHandlers(
        triggerChild.props.onTouchMove,
        handleTouchMove
      ),
      onTouchEnd: mergeHandlers(triggerChild.props.onTouchEnd, handleTouchEnd),
      onContextMenu: mergeHandlers(
        triggerChild.props.onContextMenu,
        handleContextMenu
      ),
      onClick: mergeHandlers(triggerChild.props.onClick, handleClick),
      onKeyDown: mergeHandlers(
        triggerChild.props.onKeyDown,
        handleTriggerKeyDown
      ),
    });
  } else {
    const WrapperComponent = wrapperComponent || "span";
    return (
      <WrapperComponent
        ref={triggerRef}
        css={[
          {
            display: "inline-flex",
            cursor: cursor ? cursor : popoverMode ? "pointer" : "inherit",
          },
          longPressStyles,
          triggerCss,
        ]}
        onPointerEnter={handlePointerEnter}
        onMouseMove={handleMouseMove}
        onPointerLeave={handleTriggerPointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={0}
      >
        {triggerChild}
      </WrapperComponent>
    );
  }
}

/**
 * The primary exported Tooltip component. This implements the core
 * tooltip functionality and renders the trigger and tooltip on the page.
 */
export const Tooltip = ({
  title,
  children,
  mode = "tooltip",
  wrapperComponent,
  placement,
  followCursor = false,
  showArrow = false,
  triggerTouchOnLongPress,
  longPressDelay = TOOLTIP_DEFAULT_LONG_PRESS_DELAY,
  disableTouchListener = false,
  skidding,
  distance,
  fadeDuration,
  animationDuration,
  animationDistance,
  closeDelay,
  maxWidth = TOOLTIP_DEFAULT_MAX_WIDTH,
  triggerBuffer = TOOLTIP_DEFAULT_TRIGGER_BUFFER,
  cursor,
  boxCss,
  triggerCss,
  arrowProps,
}: TooltipProps): ReactElement => {
  const tooltipId = useUniqueId("tooltip");

  let isAction = false;
  if (React.isValidElement(children)) {
    isAction = isActionTrigger(children);
  }

  const longPress = triggerTouchOnLongPress ?? isAction;

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
    skidding ??
    (followCursor
      ? TOOLTIP_DEFAULT_FOLLOW_CURSOR_SKIDDING
      : TOOLTIP_DEFAULT_SKIDDING);
  const effectiveDistance =
    distance ??
    (followCursor
      ? TOOLTIP_DEFAULT_FOLLOW_CURSOR_DISTANCE
      : TOOLTIP_DEFAULT_DISTANCE);
  const effectiveFadeDuration = fadeDuration ?? TOOLTIP_DEFAULT_FADE_DURATION;
  const effectiveAnimationDuration =
    animationDuration ?? TOOLTIP_DEFAULT_ANIMATION_DURATION;
  const effectiveAnimationDistance =
    animationDistance ?? TOOLTIP_DEFAULT_ANIMATION_DISTANCE;
  const effectiveCloseDelay = closeDelay ?? TOOLTIP_DEFAULT_CLOSE_DELAY;

  /*
   * We have separate states for mounted (in DOM) versus open (opacity 1)
   * These always change in coordination but the separation allows us to
   * animate after mounting.
   */
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [openAsPopover, setOpenAsPopover] = useState(false);

  const closeTimeoutRef = useRef<number | null>(null);
  const unmountTimeoutRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef<boolean>(false);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipBoxRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef(null);

  const middleware = [
    offset({
      mainAxis: effectiveDistance,
      crossAxis: effectiveSkidding,
    }),
    flip(),
    shift(),
  ];

  if (showArrow) {
    middleware.push(arrow({ element: arrowRef }));
  }

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
    middleware,
    whileElementsMounted: autoUpdate,
  });

  const mergedFloatingRef = useMergeRefs([tooltipBoxRef, refs.setFloating]);
  const mergedReferenceRef = useMergeRefs([triggerRef, refs.setReference]);

  const shouldShowArrowBorder = !computedPlacement.startsWith("bottom");

  useEffect(() => {
    if (mounted) {
      requestAnimationFrame(() => setOpen(true));
    } else {
      setOpen(false);
    }
  }, [mounted]);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const clearUnmountTimeout = useCallback(() => {
    if (unmountTimeoutRef.current !== null) {
      window.clearTimeout(unmountTimeoutRef.current);
      unmountTimeoutRef.current = null;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
      clearUnmountTimeout();
      clearLongPressTimer();
    };
  }, [clearCloseTimeout, clearUnmountTimeout, clearLongPressTimer]);

  const handleOpen = useCallback(
    (asPopover = false): void => {
      clearCloseTimeout();
      clearUnmountTimeout();
      setOpenAsPopover(asPopover);

      tooltipBus.emit(tooltipId);

      if (!mounted) {
        setMounted(true);
      } else {
        setOpen(true);
      }
    },
    [mounted, clearCloseTimeout, clearUnmountTimeout, tooltipId]
  );

  const handleClose = useCallback((): void => {
    clearCloseTimeout();
    clearUnmountTimeout();
    clearLongPressTimer();

    const isPopover = openAsPopover || popoverMode;

    setOpen(false);

    const totalTime = isPopover
      ? effectiveFadeDuration
      : Math.max(effectiveFadeDuration, effectiveAnimationDuration);

    unmountTimeoutRef.current = window.setTimeout(() => {
      setOpenAsPopover(false);
      setMounted(false);
      unmountTimeoutRef.current = null;
    }, totalTime);
  }, [
    clearCloseTimeout,
    clearUnmountTimeout,
    clearLongPressTimer,
    effectiveFadeDuration,
    effectiveAnimationDuration,
    openAsPopover,
    popoverMode,
  ]);

  const handleCloseWithDelay = useCallback((): void => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      handleClose();
      closeTimeoutRef.current = null;
    }, effectiveCloseDelay);
  }, [clearCloseTimeout, effectiveCloseDelay, handleClose]);

  useEffect(() => {
    if (!open || !openAsPopover) return;

    const handleDocumentClick = (e: Event): void => {
      const target = e.target as Node;
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (tooltipBoxRef.current && tooltipBoxRef.current.contains(target))
      ) {
        return;
      }
      handleClose();
    };

    document.addEventListener("touchstart", handleDocumentClick);
    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("touchstart", handleDocumentClick);
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [open, openAsPopover, handleClose]);

  /*
   * Mouse and touch event handlers
   */
  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      // we need to check that we aren't on touch (to prevent browser emulated events
      // from opening the tooltip on tap).
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") {
        return;
      }

      if (longPressTimerRef.current !== null) {
        return;
      }

      if (!popoverMode) {
        handleOpen();
      }
    },
    [popoverMode, handleOpen]
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (effectiveFollowCursor) {
        refs.setReference({
          getBoundingClientRect(): DOMRect {
            return new DOMRect(e.clientX, e.clientY, 0, 0);
          },
        });

        void update();
      }
    },
    [effectiveFollowCursor, refs, update]
  );

  const handleTriggerPointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (popoverMode || openAsPopover) return;

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
    [
      openAsPopover,
      popoverMode,
      effectiveFollowCursor,
      refs.floating,
      handleCloseWithDelay,
    ]
  );

  const handleTooltipPointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    if (isTouch) return;

    if (!popoverMode) {
      handleOpen();
    }
  }, [isTouch, popoverMode, handleOpen]);

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

      if (!openAsPopover && !popoverMode) {
        handleClose();
      }
    },
    [openAsPopover, popoverMode, refs.floating, handleClose]
  );

  const handleTouchStart = useCallback((): void => {
    if (disableTouchListener) return;
    if (!longPress) {
      if (openAsPopover) {
        handleClose();
      } else {
        handleOpen(true);
      }
      return;
    }

    // at this point we know we are in long press mode, and we start the timer
    clearLongPressTimer();
    suppressClickRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      // we don't want the click event to trigger (that follows the lifting of the finger)
      suppressClickRef.current = true;
      handleOpen(false);
      longPressTimerRef.current = null;
    }, longPressDelay);
  }, [
    disableTouchListener,
    longPress,
    openAsPopover,
    handleClose,
    handleOpen,
    clearLongPressTimer,
    longPressDelay,
  ]);

  const handleTouchMove = useCallback(() => {
    if (!longPress) return;
    clearLongPressTimer();
  }, [longPress, clearLongPressTimer]);

  const handleTouchEnd = useCallback(() => {
    if (!longPress) return;

    clearLongPressTimer();
    handleClose();
  }, [longPress, clearLongPressTimer, handleClose]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (longPress) {
        e.preventDefault();
      }
    },
    [longPress]
  );

  const handleClick = useCallback((): void => {
    if (!popoverMode || isTouch) return;
    open ? handleClose() : handleOpen(true);
  }, [popoverMode, isTouch, open, handleClose, handleOpen]);

  /*
   * This effect intercepts the onclick and, after a long press, allows
   * us to suppress the click event that would have otherwise happened.
   */
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !longPress) return;

    const suppressClick = (e: MouseEvent): void => {
      if (suppressClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressClickRef.current = false;
      }
    };

    trigger.addEventListener("click", suppressClick, { capture: true });
    return () => {
      trigger.removeEventListener("click", suppressClick, { capture: true });
    };
  }, [longPress, suppressClickRef]);

  /*
   * Keyboard interaction handlers
   */
  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === "Enter" && popoverMode) {
        e.preventDefault();
        open ? handleClose() : handleOpen(true);
        return;
      }

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
    [open, popoverMode, handleClose, handleOpen]
  );

  const handleTooltipKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

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
    if (!open || effectiveFollowCursor || openAsPopover) return;

    function onMouseMove(e: MouseEvent): void {
      const shouldKeepOpen = cursorInSafeZone(
        e,
        triggerRef,
        tooltipBoxRef,
        computedPlacement,
        triggerBuffer
      );

      if (shouldKeepOpen) {
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
    popoverMode,
    openAsPopover,
  ]);

  const triggerNode = createTriggerNode({
    children,
    cursor,
    popoverMode,
    wrapperComponent,
    triggerRef: mergedReferenceRef,
    handlePointerEnter,
    handleMouseMove,
    handleTriggerPointerLeave,
    handleFocus,
    handleBlur,
    handleTouchStart,
    handleClick,
    handleTouchMove,
    handleTouchEnd,
    handleContextMenu,
    handleTriggerKeyDown,
    triggerTouchOnLongPress: longPress,
    triggerCss,
  });

  useEffect(() => {
    const busCallback: TooltipCallback = (activeTooltipId: string) => {
      if (
        activeTooltipId !== tooltipId &&
        (mounted || open) &&
        !openAsPopover
      ) {
        handleClose();
      }
    };
    tooltipBus.subscribe(busCallback);
    return () => {
      tooltipBus.unsubscribe(busCallback);
    };
  }, [tooltipId, mounted, open, openAsPopover, handleClose]);

  const defaultArrowProps = {
    fill: theme.colors.box.tooltip.pill,
    stroke: "hsla(0, 0%, 0%, 0.2)",
    strokeWidth: shouldShowArrowBorder ? 1 : 0,
  };

  return (
    <>
      {triggerNode}

      {mounted && (
        <FloatingPortal preserveTabOrder={false}>
          <TooltipBox
            ref={mergedFloatingRef}
            role="tooltip"
            onKeyDown={handleTooltipKeyDown}
            onPointerLeave={handleTooltipPointerLeave}
            $maxWidth={effectiveMaxWidth}
            $placement={computedPlacement}
            $visible={open}
            $animationDuration={effectiveAnimationDuration}
            $fadeDuration={effectiveFadeDuration}
            $followCursor={effectiveFollowCursor}
            $animationDistance={effectiveAnimationDistance}
            $openAsPopover={openAsPopover}
            $showArrow={showArrow}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
            }}
            css={boxCss}
          >
            {title}

            {(popoverMode || openAsPopover) && (
              <CloseButton
                className="tooltip-close"
                onClick={(): void => handleClose()}
                tabIndex={-1}
              >
                <Close />
              </CloseButton>
            )}

            {showArrow && (
              <FloatingArrow
                className={"tooltip-arrow"}
                ref={arrowRef}
                context={context}
                {...defaultArrowProps}
                {...arrowProps}
              />
            )}
          </TooltipBox>
        </FloatingPortal>
      )}
    </>
  );
};
