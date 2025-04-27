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
 * A dialog component.
 *
 * This component provides dialog and modal functionality, with a number
 * of options for customization.
 *
 * A dialog can accept both simple text and React components as children;
 * however it is highly recommended to use the following child components
 * to organize the dialog, in this order:
 *
 * DialogTitle: For the dialog header/title area
 * DialogContent: For the main dialog content
 * DialogActions: For dialog buttons and actions
 *
 * The DialogTitle and DialogActions components can be omitted if not
 * desired.
 *
 * The dialog provides keyboard control in the form of focus
 * trapping and escape-to-close, and it suppresses the scrolling of
 * the page behind it when the dialog is open.
 *
 * A number of options are available to customize the dialog. These
 * are described in the interface for the component.
 *
 * The dialog as a whole and each component part of the dialog can
 * be styled using either Emotion's styled API or css props. In
 * practice, the dialog will usually be left without styles in
 * order to match the theme.
 *
 * Some example usages of the dialog:
 *
 * // Basic dialog
 * <Dialog open={open} onClose={handleClose}>
 *   <DialogTitle>Dialog Title</DialogTitle>
 *   <DialogContent>
 *     <p>This is a simple dialog with text content.</p>
 *   </DialogContent>
 *   <DialogActions>
 *     <Button onClick={handleClose}>Cancel</Button>
 *     <Button onClick={handleConfirm}>Confirm</Button>
 *   </DialogActions>
 * </Dialog>
 *
 * // Dialog with close button in title
 * <Dialog open={open} onClose={handleClose} showCloseButton>
 *   <DialogTitle>Dialog with Close Button</DialogTitle>
 *   <DialogContent>
 *     <p>This dialog shows a close button in the title area.</p>
 *   </DialogContent>
 * </Dialog>
 *
 * // Dialog with a maximum width variant set
 * <Dialog
 *   open={open}
 *   onClose={handleClose}
 *   maxWidth="lg"
 * >
 *   <DialogTitle>Large Dialog</DialogTitle>
 *   <DialogContent>
 *     <p>
 *       This dialog takes up as much space as needed up to
 *       the width specified by the large variant.
 *     </p>
 *   </DialogContent>
 * </Dialog>
 *
 * // Dialog with a maximum width variant and fullWidth set
 * <Dialog
 *   open={open}
 *   onClose={handleClose}
 *   maxWidth="md"
 *   fullWidth
 * >
 *   <DialogTitle>Medium Dialog</DialogTitle>
 *   <DialogContent>
 *     <p>
 *       This dialog will always be the width specified
 *       by the medium variant, even if it doesn't need.
 *       that much space.
 *     </p>
 *   </DialogContent>
 * </Dialog>
 *
 * // Dialog with custom styling
 * <Dialog
 *   open={open}
 *   onClose={handleClose}
 *   containerCss={css`background-color: rgba(0, 0, 0, 0.8);`}
 *   contentCss={css`background-color: #f5f5f5;`}
 * >
 *   <DialogTitle>Styled Dialog</DialogTitle>
 *   <DialogContent>
 *     <p>This dialog uses custom styling for the container and content.</p>
 *   </DialogContent>
 * </Dialog>
 *
 * // Dialog in a specific container
 * <Dialog
 *   open={open}
 *   onClose={handleClose}
 *   containerRef={myContainerRef}
 * >
 *   <DialogTitle>Contained Dialog</DialogTitle>
 *   <DialogContent>
 *     <p>This dialog is rendered into a specific container element.</p>
 *   </DialogContent>
 * </Dialog>
 *
 * // Dialog that remains mounted when closed
 * <Dialog
 *   open={open}
 *   onClose={handleClose}
 *   keepMounted
 * >
 *   <DialogTitle>Persistent Dialog</DialogTitle>
 *   <DialogContent>
 *     <p>
 *       This dialog stays in the DOM even when closed.
 *       This is useful for content that is complex and
 *       takes time to load or render, or for when content
 *       should be persisted even when the dialog is closed.
 *     </p>
 *   </DialogContent>
 * </Dialog>
 */

/** @jsxImportSource @emotion/react */

import { css, Interpolation, Theme, useTheme } from "@emotion/react";
import React, {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";

import { Close } from "../icons/close";
import { ProgressActivity } from "../icons/progress_activity";

interface DialogContextType {
  onClose: () => void;
  showCloseButton: boolean;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialogContext = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog component");
  }
  return context;
};

interface DialogContainerProps {
  children: ReactNode;
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
  css?: Interpolation<Theme>;
}

const DIALOG_DEFAULT_FADE_IN_DURATION = 150;
const DIALOG_DEFAULT_FADE_OUT_DURATION = 150;
const DIALOG_DEFAULT_POST_LOAD_FADE_IN_DURATION = 75;

const DialogContainer = ({
  children,
  className,
  containerRef,
  css: baseCss,
}: DialogContainerProps): ReactElement => {
  const container = containerRef?.current || document.body;

  return ReactDOM.createPortal(
    <div
      className={`dialog-container ${className || ""}`}
      css={[
        css`
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 10000;
        `,
        baseCss,
      ]}
    >
      {children}
    </div>,
    container
  );
};

const maxWidthPixelMap = {
  sm: 420,
  md: 640,
  lg: 960,
} as const;

type DialogMaxWidth = keyof typeof maxWidthPixelMap | false;

interface DialogProps {
  // If true, the dialog will be open
  open: boolean;
  // Callback fired when the dialog requests to be closed.
  onClose: () => void;
  // Dialog content - typically DialogTitle, DialogContent,
  // and DialogActions components.
  children: ReactNode;
  // If true, show a loading spinner rather than the dialog.
  // This allows dynamic content to load before we display the dialog.
  // Default: false
  loading?: boolean;
  // Additional class name applied to the dialog.
  className?: string;
  // Reference to a DOM element where the dialog should be rendered.
  // Defaults: document.body.
  containerRef?: React.RefObject<HTMLElement>;
  // If true, the dialog will remain in the DOM even when closed.
  // Default: false
  keepMounted?: boolean;
  // Duration of the fade-in animation in milliseconds.
  // Default: 150ms
  fadeInDuration?: number;
  // Duration of the fade-in animation in milliseconds when coming from loading state.
  // Default: 50ms
  fadeInDurationPostLoad?: number;
  // Duration of the fade-out animation in milliseconds.
  // Default: 150ms
  fadeOutDuration?: number;
  // If true, pressing the escape key will not close the dialog.
  // Default: false
  disableEscapeToClose?: boolean;
  // If true, clicking outside the dialog will not close it.
  // Default: false
  disableOutsideClickToClose?: boolean;
  // If true, shows a close button in the top-right corner of the dialog.
  // Requires the use of the DialogTitle component.
  // Default: false
  showCloseButton?: boolean;
  // Controls the maximum width of the dialog.
  // 'sm': 360px, 'md': 600px, 'lg': 800px, false: no maximum width
  // Default: 'md'
  maxWidth?: DialogMaxWidth;
  // If true, the dialog will take up the full available width (up to maxWidth
  // or the size of the screen).
  // Default: false
  fullWidth?: boolean;
  // CSS customization for the outer container.
  containerCss?: Interpolation<Theme>;
  // CSS customization for the overlay/backdrop.
  overlayCss?: Interpolation<Theme>;
  // CSS customization for the dialog content.
  contentCss?: Interpolation<Theme>;
}

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [contenteditable], [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      !el.getAttribute("aria-hidden") &&
      el.tabIndex !== -1
  );
};

export const Dialog = ({
  open,
  onClose,
  loading = false,
  children,
  className,
  containerRef,
  keepMounted = false,
  fadeInDuration = DIALOG_DEFAULT_FADE_IN_DURATION,
  fadeInDurationPostLoad = DIALOG_DEFAULT_POST_LOAD_FADE_IN_DURATION,
  fadeOutDuration = DIALOG_DEFAULT_FADE_OUT_DURATION,
  disableEscapeToClose = false,
  disableOutsideClickToClose = false,
  showCloseButton = false,
  maxWidth = "md",
  fullWidth = false,
  containerCss,
  overlayCss,
  contentCss,
}: DialogProps): ReactElement => {
  const theme = useTheme();

  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const hasReceivedInteraction = useRef(false);
  const prevOpenRef = useRef(open);
  const hasBeenLoadingRef = useRef(false);

  const closeTimeoutRef = useRef<number | null>(null);
  const htmlStyleRef = useRef({ overflow: "", paddingRight: "" });

  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (prevOpenRef.current !== open) {
      clearCloseTimeout();

      if (open) {
        setIsClosing(false);
        setIsVisible(true);
        hasReceivedInteraction.current = true;

        lastFocusedElementRef.current = document.activeElement as HTMLElement;

        const html = document.documentElement;
        htmlStyleRef.current = {
          overflow: html.style.overflow,
          paddingRight: html.style.paddingRight,
        };

        const scrollbarWidth = window.innerWidth - html.clientWidth;

        html.style.overflow = "hidden";

        if (scrollbarWidth > 0) {
          html.style.paddingRight = `${scrollbarWidth}px`;
        }
      } else if (hasReceivedInteraction.current) {
        setIsClosing(true);
        setIsVisible(false);

        if (fadeOutDuration > 0) {
          closeTimeoutRef.current = window.setTimeout(() => {
            setIsClosing(false);
            closeTimeoutRef.current = null;
          }, fadeOutDuration);
        } else {
          setIsClosing(false);
        }

        lastFocusedElementRef.current?.focus();
        lastFocusedElementRef.current = null;
      }

      prevOpenRef.current = open;
    }
  }, [clearCloseTimeout, fadeOutDuration, open]);

  useEffect(() => {
    const html = document.documentElement;
    if (hasReceivedInteraction.current && !isVisible && !isClosing) {
      html.style.overflow = htmlStyleRef.current.overflow;
      html.style.paddingRight = htmlStyleRef.current.paddingRight;
    }
  }, [isClosing, isVisible]);

  useEffect(() => {
    if (loading) {
      hasBeenLoadingRef.current = true;
    }
  }, [loading]);

  useEffect(() => {
    if (!open || disableEscapeToClose) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose, disableEscapeToClose]);

  useEffect(() => {
    if (!open || !isVisible) return;

    const node = dialogRef.current;
    if (!node) return;

    const [first] = getFocusableElements(node);
    (first || node).focus({ preventScroll: true });
  }, [open, isVisible]);

  useEffect(() => {
    if (!open) return;

    const node = dialogRef.current;
    if (!node) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== "Tab") return;

      const elements = getFocusableElements(node);
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = elements[0];
      const lastEl = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement;

      if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      } else if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const isInteractive = isVisible || isClosing;
  const shouldShow = isInteractive || keepMounted;

  const getActiveFadeDuration = (): number => {
    if (!isVisible) return fadeOutDuration;

    if (hasBeenLoadingRef.current && !loading) {
      hasBeenLoadingRef.current = false;
      return fadeInDurationPostLoad;
    }

    return fadeInDuration;
  };

  const widthCss = fullWidth
    ? css`
        width: 100%;
      `
    : css`
        width: auto;
      `;

  const maxWidthCss =
    maxWidth === false
      ? css``
      : css`
          max-width: min(${maxWidthPixelMap[maxWidth]}px, calc(100vw - 32px));
        `;

  const handleOverlayClick = (): void => {
    if (!disableOutsideClickToClose) {
      onClose();
    }
  };

  return (
    <DialogContext.Provider value={{ onClose, showCloseButton }}>
      <DialogContainer containerRef={containerRef} css={containerCss}>
        <div
          role="presentation"
          onClick={handleOverlayClick}
          className="dialog-overlay"
          css={[
            css`
              position: fixed;
              inset: 0;
              background-color: rgba(0, 0, 0, 0.5);
              opacity: ${isVisible ? 1 : 0};
              transition: opacity ${getActiveFadeDuration()}ms ease-in-out;
              pointer-events: ${isInteractive ? "auto" : "none"};
              z-index: 1;
            `,
            overlayCss,
          ]}
        />

        {isInteractive && loading && (
          <div
            css={css`
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              pointer-events: none;
              z-index: 10001;
            `}
          >
            <ProgressActivity height={"75px"} fill={"hsl(216, 55%, 98%)"} />
          </div>
        )}

        <div
          role="dialog"
          ref={dialogRef}
          inert={!isInteractive ? "" : undefined}
          className={`dialog ${className || ""}`}
          aria-modal={isInteractive ? "true" : "false"}
          tabIndex={-1}
          css={[
            css`
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              display: flex;
              flex-direction: column;
              gap: ${theme.spacing.sm}px;
              max-height: calc(100vh - 64px);
              background: #fff;
              opacity: ${isVisible && !loading ? 1 : 0};
              transition: opacity ${getActiveFadeDuration()}ms ease-in-out;
              z-index: 2;
              pointer-events: ${isInteractive ? "auto" : "none"};
              overflow: hidden;
              ${theme.elevation.primary}
              ${theme.radius.primary};
            `,
            widthCss,
            maxWidthCss,
            contentCss,
          ]}
        >
          {shouldShow && children}
        </div>
      </DialogContainer>
    </DialogContext.Provider>
  );
};

interface DialogSubComponentProps {
  // Content of the dialog component.
  children: ReactNode;
  // Additional class name applied to the component.
  className?: string;
  // CSS customization for this component.
  css?: Interpolation<Theme>;
}

export const DialogTitle = ({
  children,
  className,
  css: baseCss,
}: DialogSubComponentProps): ReactElement => {
  const { onClose, showCloseButton } = useDialogContext();
  const theme = useTheme();

  return (
    <div
      className={`dialog-title ${className || ""}`}
      css={[
        css`
          padding: ${theme.spacing.lg}px ${theme.spacing.lg}px
            ${theme.spacing.sm}px ${theme.spacing.lg}px;
        `,
        baseCss,
      ]}
    >
      <h3
        css={css`
          ${theme.typography.family.heading}
          ${theme.typography.heading.xs}
          margin: 0;
          padding: 0 ${theme.spacing.xl}px 0 0;
        `}
      >
        {children}
      </h3>
      {showCloseButton && (
        <button
          aria-label="close"
          onClick={onClose}
          className="dialog-close-button"
          css={css`
            position: absolute;
            margin: 0;
            padding: 0;
            display: block;
            top: ${theme.spacing.lg}px;
            right: ${theme.spacing.lg}px;
            background: transparent;
            border: none;
            cursor: pointer;
            color: ${theme.colors.text.primary.base};
            &:hover {
              color: ${theme.colors.link.primary.base};
            }
          `}
        >
          <Close />
        </button>
      )}
    </div>
  );
};

export const DialogContent = ({
  children,
  className,
  css: baseCss,
}: DialogSubComponentProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      className={`dialog-content ${className || ""}`}
      css={[
        css`
          padding: 0 ${theme.spacing.lg}px;
          overflow: auto;
        `,
        baseCss,
      ]}
    >
      {children}
    </div>
  );
};

export const DialogActions = ({
  children,
  className,
  css: baseCss,
}: DialogSubComponentProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      className={`dialog-actions ${className || ""}`}
      css={[
        css`
          padding: ${theme.spacing.sm}px ${theme.spacing.lg}px
            ${theme.spacing.lg}px ${theme.spacing.lg}px;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: ${theme.spacing.md}px;
        `,
        baseCss,
      ]}
    >
      {children}
    </div>
  );
};
