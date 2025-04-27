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
 * A button component.
 *
 * This component provides button functionality with a number of options for
 * customization. It can be rendered as either a button element or an anchor
 * element depending on whether an href prop is provided.
 *
 * The button component handles various styling variants, sizes, and can
 * include icons at the start or end of the content. It also handles
 * disabled states.
 *
 * The button renders with styling consistent with the current theme by default,
 * but it can be customized using Emotion's styled API or css props.
 *
 * Some example usages of the button:
 *
 * // Basic button
 * <Button onClick={handleClick}>Click Me</Button>
 *
 * // Button with variant
 * <Button variant="inverted" onClick={handleClick}>
 *   Inverted Button
 * </Button>
 *
 * // Button with size
 * <Button size="lg" onClick={handleClick}>
 *   Large Button
 * </Button>
 *
 * // Disabled button
 * <Button disabled onClick={handleClick}>
 *   Disabled Button
 * </Button>
 *
 * // Button with start icon
 * <Button startIcon={<Icon />} onClick={handleClick}>
 *   Button with Icon
 * </Button>
 *
 * // Button with end icon
 * <Button endIcon={<Icon />} onClick={handleClick}>
 *   Button with Icon
 * </Button>
 *
 * // Button rendered as anchor
 * <Button href="https://example.com">
 *   Link Button
 * </Button>
 *
 * // Button with custom styling
 * <Button
 *   onClick={handleClick}
 *   css={css`
 *     background-color: purple;
 *     color: white;
 *   `}
 * >
 *   Button with Custom Styles
 * </Button>
 *
 * // Text button
 * <Button variant="text" onClick={handleClick}>
 *   Text Button
 * </Button>
 *
 * // Combined options
 * <Button
 *   variant="inverted"
 *   size="sm"
 *   startIcon={<Icon />}
 *   onClick={handleClick}
 * >
 *   Small Inverted Button with Icon
 * </Button>
 */

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

/**
 * Common props shared between button and anchor renderings.
 */
interface CommonButtonProps {
  // The visual style of the button.
  // 'standard': an outlined button
  // 'inverted': a filled button.
  // 'text': a text-only button (no outline or fill).
  // Default: 'standard'
  variant?: "standard" | "inverted" | "text";
  // The size of the button.
  // Default: 'md'
  size?: "sm" | "md" | "lg";
  // If true, the button will be disabled.
  // Default: false
  disabled?: boolean;
  // Optional icon to display at the start (left) of the button content.
  startIcon?: ReactElement<IconComponent>;
  // Optional icon to display at the end (right) of the button content.
  endIcon?: ReactElement<IconComponent>;
  // Additional class name applied to the button.
  className?: string;
  // CSS customization.
  css?: Interpolation<Theme>;
  // Button content
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
