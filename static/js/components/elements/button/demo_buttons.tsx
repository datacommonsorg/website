/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import React, { ReactElement, useState } from "react";

import { ArrowBack } from "../icons/arrow_back";
import { ArrowForward } from "../icons/arrow_forward";
import { ArrowOutward } from "../icons/arrow_outward";
import { Close } from "../icons/close";
import { Download } from "../icons/download";
import { Button } from "./button";

const GreenButton = styled(Button)`
  border-color: #4caf50;
  background-color: #4caf50;
  color: white;

  &:hover:not(:disabled):not([aria-disabled]) {
    border-color: #4caf50;
    background-color: white;
    color: #4caf50;
  }
`;

export const DemoButtons = (): ReactElement => {
  const theme = useTheme();
  const [counter, setCounter] = useState(0);

  const incrementCounter = (): void => {
    setCounter(counter + 1);
  };

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 20px;

        @media (max-width: ${theme.breakpoints.md}px) {
          grid-template-columns: 1fr;
        }

        .section {
          ${theme.radius.tertiary};
          background: ${theme.colors.background.secondary.light};
          padding: ${theme.spacing.lg}px;
        }

        .button-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        h3 {
          ${theme.typography.family.heading};
          ${theme.typography.heading.xs};
          margin-bottom: ${theme.spacing.md}px;
        }
      `}
    >
      <div className="section">
        <h3>Basic Button Variants</h3>
        <div className="button-group">
          <Button>Standard Button</Button>
          <Button variant="inverted">Inverted Button</Button>
          <Button variant="text">Text Button</Button>
        </div>
      </div>

      <div className="section">
        <h3>Disabled Button Variants</h3>
        <div className="button-group">
          <Button disabled>Disabled Button</Button>
          <Button variant="inverted" disabled>
            Disabled Inverted Button
          </Button>
          <Button variant="text" disabled>
            Disabled Text Button
          </Button>
        </div>
      </div>

      <div className="section">
        <h3>Buttons with Icons</h3>
        <div className="button-group">
          <Button startIcon={<Download />}>Download</Button>
          <Button endIcon={<Close />}>Close Button</Button>
          <Button startIcon={<ArrowBack />} endIcon={<ArrowForward />}>
            Double Arrow
          </Button>

          <Button variant="inverted" startIcon={<Download />}>
            Download
          </Button>
          <Button variant="inverted" endIcon={<Close />}>
            Close Button
          </Button>
          <Button
            variant="inverted"
            startIcon={<ArrowBack />}
            endIcon={<ArrowForward />}
          >
            Double Arrow
          </Button>

          <Button variant="text" startIcon={<Download />}>
            Download
          </Button>
          <Button variant="text" endIcon={<Close />}>
            Close Button
          </Button>
          <Button
            variant="text"
            startIcon={<ArrowBack />}
            endIcon={<ArrowForward />}
          >
            Double Arrow
          </Button>
        </div>
      </div>

      <div className="section">
        <h3>Styled Buttons with Emotion</h3>
        <div className="button-group">
          <GreenButton>Green Button (Styled API)</GreenButton>
          <Button
            css={css`
              background-color: #f44336;
              color: white;
              &:hover:not(:disabled) {
                background-color: #d32f2f;
              }
            `}
          >
            Red Button (CSS Prop Styled)
          </Button>
        </div>
      </div>

      <div className="section">
        <h3>Link Buttons</h3>
        <div className="button-group">
          <Button href="https://www.google.com" target="_blank">
            Google Link
          </Button>
          <Button
            variant="text"
            href="https://www.github.com"
            target="_blank"
            endIcon={<ArrowOutward />}
          >
            GitHub
          </Button>
          <Button href="https://example.com" disabled>
            Disabled Link
          </Button>
        </div>
      </div>

      <div className="section">
        <h3>Size Variations</h3>
        <div className="button-group">
          <Button size="sm">Small Button</Button>
          <Button size="md">Medium Button</Button>
          <Button size="lg">Large Button</Button>
        </div>
      </div>

      <div className="section">
        <h3>Button with action</h3>
        <div className="button-group">
          <div>Click Counter: {counter}</div>
          <Button onClick={incrementCounter}>Increment Counter</Button>
        </div>
      </div>
    </div>
  );
};
