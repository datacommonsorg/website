/** @jsxImportSource @emotion/react */

import { css, Interpolation, Theme, useTheme } from "@emotion/react";
import React, {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ForwardedRef,
  forwardRef,
  ReactElement,
  ReactNode,
  SVGProps,
} from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface CommonButtonProps {
  variant?: "standard" | "text";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  startIcon?: ReactElement<IconComponent>;
  endIcon?: ReactElement<IconComponent>;
  className?: string;
  css?: Interpolation<Theme>;
  children?: ReactNode;
}

interface ButtonElementProps
  extends CommonButtonProps,
    ButtonHTMLAttributes<HTMLButtonElement> {
  href?: undefined;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

interface AnchorElementProps
  extends CommonButtonProps,
    AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

type ButtonProps = ButtonElementProps | AnchorElementProps;

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>((props: ButtonProps, ref) => {
  const {
    variant = "standard",
    size = "md",
    disabled = false,
    startIcon,
    endIcon,
    className = "",
    css: baseCss,
    children,
    ...rest
  } = props;

  const theme = useTheme();

  const commonStyles = css`
    border: 0;
    ${theme.typography.family.text};
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: ${theme.spacing.sm}px;
    cursor: pointer;
    opacity: ${disabled ? 0.6 : 1};
    text-decoration: none;

    &:disabled {
      cursor: default;
    }
  `;

  const sizeStyles = {
    sm: css`
      ${theme.typography.text.sm};
      line-height: 1rem;
      padding: 6px ${theme.spacing.md}px;
    `,
    md: css`
      ${theme.typography.text.md};
      line-height: 1rem;
      padding: 10px ${theme.spacing.lg}px;
    `,
    lg: css`
      ${theme.typography.text.lg};
      line-height: 1rem;
      padding: 14px ${theme.spacing.xl}px;
    `,
  };

  const variantStyles = {
    standard: css`
      ${theme.box.primary}
      ${theme.elevation.primary}
      ${theme.radius.primary};
      color: ${theme.colors.link.primary.base};
      background-color: white;
    `,
    text: css`
      background: transparent;
      color: ${theme.colors.link.primary.base};
    `,
  };

  const isAnchor = "href" in rest && rest.href !== undefined;

  if (isAnchor) {
    const { href, onClick, ...anchorProps } = rest as AnchorElementProps;

    return (
      <a
        ref={ref as ForwardedRef<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        onClick={
          disabled
            ? (e: React.MouseEvent<HTMLAnchorElement>): void =>
                e.preventDefault()
            : onClick
        }
        className={`button button-${variant} button-${size} ${className}`}
        css={[commonStyles, sizeStyles[size], variantStyles[variant], baseCss]}
        {...anchorProps}
        aria-disabled={disabled ? true : undefined}
      >
        {startIcon && <span className="button-start-icon">{startIcon}</span>}
        {children}
        {endIcon && <span className="button-end-icon">{endIcon}</span>}
      </a>
    );
  }

  const { onClick, ...buttonProps } = rest as ButtonElementProps;

  return (
    <button
      ref={ref as ForwardedRef<HTMLButtonElement>}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`button button-${variant} button-${size} ${className}`}
      css={[commonStyles, sizeStyles[size], variantStyles[variant], baseCss]}
      {...buttonProps}
    >
      {startIcon && <span className="button-start-icon">{startIcon}</span>}
      {children}
      {endIcon && <span className="button-end-icon">{endIcon}</span>}
    </button>
  );
});

Button.displayName = "Button";
