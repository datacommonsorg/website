/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
import React, {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";

interface DialogContextType {
  onClose: () => void;
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
}

export const Dialog = ({
  open,
  onClose,
  children,
  className,
  containerRef,
}: DialogProps): ReactElement => {
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const htmlStyleRef = useRef({ overflow: "", paddingRight: "" });

  useEffect(() => {
    setIsMounted(true);

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && open) {
        onClose();
      }
    };

    const html = document.documentElement;

    if (open) {
      htmlStyleRef.current = {
        overflow: html.style.overflow,
        paddingRight: html.style.paddingRight,
      };

      const scrollbarWidth = window.innerWidth - html.clientWidth;

      html.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        html.style.paddingRight = `${scrollbarWidth}px`;
      }

      document.addEventListener("keydown", handleEscape);
      setIsExiting(false);

      return () => {
        document.removeEventListener("keydown", handleEscape);
        setIsExiting(true);
      };
    }

    document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const handleTransitionEnd = (
    event: React.TransitionEvent<HTMLDivElement>
  ): void => {
    if (event.propertyName === "opacity" && !open && isExiting) {
      const html = document.documentElement;

      html.style.overflow = htmlStyleRef.current.overflow;
      html.style.paddingRight = htmlStyleRef.current.paddingRight;

      setIsExiting(false);
    }
  };

  const shouldShow = isMounted && (open || isExiting);

  return (
    <DialogContext.Provider value={{ onClose }}>
      <DialogContainer containerRef={containerRef}>
        <div
          role="presentation"
          onClick={onClose}
          onTransitionEnd={handleTransitionEnd}
          className="dialog-overlay"
          css={css`
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.5);
            pointer-events: ${shouldShow ? "auto" : "none"};
            opacity: ${open ? 1 : 0};
            transition: opacity 225ms ease-out;
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
            max-height: calc(100vh - 64px);
            max-width: 600px;
            width: 100%;
            background: #fff;
            border-radius: 4px;
            opacity: ${open ? 1 : 0};
            transition: opacity 225ms ease-out;
            z-index: 2;
            pointer-events: ${shouldShow ? "auto" : "none"};
          `}
        >
          {children}
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
  const { onClose } = useDialogContext();

  return (
    <div
      className={`dialog-title ${className || ""}`}
      css={css`
        padding: 16px 24px;
        font-size: 20px;
        font-weight: 500;
        position: relative;
      `}
    >
      {children}
      <button
        aria-label="close"
        onClick={onClose}
        className="dialog-close-button"
        css={css`
          position: absolute;
          right: 8px;
          top: 8px;
          background: transparent;
          border: none;
          font-size: 10px;
          cursor: pointer;
        `}
      >
        Close
      </button>
    </div>
  );
};

export const DialogContent = ({
  children,
  className,
}: DialogSubComponentProps): ReactElement => (
  <div
    className={`dialog-content ${className || ""}`}
    css={css`
      padding: 8px 24px;
      overflow: auto;
    `}
  >
    {children}
  </div>
);

export const DialogActions = ({
  children,
  className,
}: DialogSubComponentProps): ReactElement => {
  return (
    <div
      className={`dialog-actions ${className || ""}`}
      css={css`
        padding: 8px 24px;
        display: flex;
        justify-content: flex-end;
      `}
    >
      {children}
    </div>
  );
};
