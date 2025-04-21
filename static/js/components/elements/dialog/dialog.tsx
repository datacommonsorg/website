/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
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
}

const DIALOG_DEFAULT_FADE_IN_DURATION = 150;
const DIALOG_DEFAULT_FADE_OUT_DURATION = 150;

const DialogContainer = ({
  children,
  className,
  containerRef,
}: DialogContainerProps): ReactElement => {
  const container = containerRef?.current || document.body;

  return ReactDOM.createPortal(
    <div
      className={`dialog-container ${className || ""}`}
      css={css`
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 10000;
      `}
    >
      {children}
    </div>,
    container
  );
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
  keepMounted?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  disableEscapeToClose?: boolean;
  disableOutsideClickToClose?: boolean;
  showCloseButton?: boolean;
}

export const Dialog = ({
  open,
  onClose,
  children,
  className,
  containerRef,
  keepMounted = false,
  fadeInDuration = DIALOG_DEFAULT_FADE_IN_DURATION,
  fadeOutDuration = DIALOG_DEFAULT_FADE_OUT_DURATION,
  disableEscapeToClose = false,
  disableOutsideClickToClose = false,
  showCloseButton = false,
}: DialogProps): ReactElement => {
  const theme = useTheme();

  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const hasReceivedInteraction = useRef(false);
  const prevOpenRef = useRef(open);

  const closeTimeoutRef = useRef<number | null>(null);
  const htmlStyleRef = useRef({ overflow: "", paddingRight: "" });

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
    if (!open || disableEscapeToClose) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, disableEscapeToClose]);

  const shouldShow = isVisible || isClosing || keepMounted;

  const handleOverlayClick = (): void => {
    if (!disableOutsideClickToClose) {
      onClose();
    }
  };

  return (
    <DialogContext.Provider value={{ onClose, showCloseButton }}>
      <DialogContainer containerRef={containerRef}>
        <div
          role="presentation"
          onClick={handleOverlayClick}
          className="dialog-overlay"
          css={css`
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.5);
            pointer-events: ${shouldShow ? "auto" : "none"};
            opacity: ${isVisible ? 1 : 0};
            transition: opacity
              ${isVisible ? fadeInDuration : fadeOutDuration}ms ease-in-out;
            z-index: 1;
          `}
        />

        <div
          role="dialog"
          className={`dialog ${className || ""}`}
          aria-modal={shouldShow ? "true" : "false"}
          css={css`
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            gap: ${theme.spacing.sm}px;
            max-height: calc(100vh - 64px);
            max-width: 600px;
            width: 100%;
            background: #fff;
            opacity: ${isVisible ? 1 : 0};
            transition: opacity
              ${isVisible ? fadeInDuration : fadeOutDuration}ms ease-in-out;
            z-index: 2;
            pointer-events: ${shouldShow ? "auto" : "none"};
            overflow: hidden;
            ${theme.elevation.primary}
            ${theme.radius.primary};
          `}
        >
          {shouldShow && children}
        </div>
      </DialogContainer>
    </DialogContext.Provider>
  );
};

interface DialogSubComponentProps {
  children: ReactNode;
  className?: string;
}

export const DialogTitle = ({
  children,
  className,
}: DialogSubComponentProps): ReactElement => {
  const { onClose, showCloseButton } = useDialogContext();
  const theme = useTheme();

  return (
    <div
      className={`dialog-title ${className || ""}`}
      css={css`
        padding: ${theme.spacing.lg}px ${theme.spacing.lg}px
          ${theme.spacing.sm}px ${theme.spacing.lg}px;
        overflow: auto;
      `}
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
}: DialogSubComponentProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      className={`dialog-content ${className || ""}`}
      css={css`
        padding: 0 ${theme.spacing.lg}px;
        overflow: auto;
      `}
    >
      {children}
    </div>
  );
};

export const DialogActions = ({
  children,
  className,
}: DialogSubComponentProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      className={`dialog-actions ${className || ""}`}
      css={css`
        padding: ${theme.spacing.sm}px ${theme.spacing.lg}px
          ${theme.spacing.lg}px ${theme.spacing.lg}px;
        display: flex;
        justify-content: flex-end;
        gap: ${theme.spacing.lg}px;
      `}
    >
      {children}
    </div>
  );
};
