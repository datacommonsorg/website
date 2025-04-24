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
  variant?: "standard" | "inverted" | "text";
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
    ${theme.typography.family.text}
    ${theme.radius.full}
    border: 0;
    margin: 0;
    padding: 0;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: ${theme.spacing.sm}px;
    cursor: pointer;
    opacity: ${disabled ? 0.6 : 1};
    text-decoration: none;
    &:hover {
      text-decoration: none;
    }
    &:disabled,
    &[aria-disabled="true"] {
      cursor: default;
    }
  `;

  const sizeStyles = {
    sm: css`
      ${theme.button.size.sm}
      ${theme.typography.text.sm}
      line-height: 1rem;
    `,
    md: css`
      ${theme.button.size.md}
      ${theme.typography.text.md}
      line-height: 1rem
    `,
    lg: css`
      ${theme.button.size.lg}
      ${theme.typography.text.lg}
      line-height: 1rem;
    `,
  };

  const variantStyles = {
    standard: css`
      ${theme.button.type.primary}
    `,
    inverted: css`
      ${theme.button.type.secondary}
    `,
    text: css`
      ${theme.button.type.tertiary}
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
