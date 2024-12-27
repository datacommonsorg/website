/**
 * Copyright 2022 Google LLC
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
 * Time slider component.
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Context } from "./context";

const INTERVAL_MS = 1000;
const SLIDER_MARGIN = 16;
const TICK_OFFSET = 3;
const TICK_MARGIN = 6;
const HANDLE_WIDTH = 4;
const HANDLE_MARGIN = SLIDER_MARGIN - HANDLE_WIDTH / 2;

interface TimeSliderProps {
  // Current date of map
  currentDate: string;

  // Selected dates to display on time slider
  dates: Array<string>;

  // Hash representing current time series
  metahash: string;

  // Whether the slider is enabled on refresh
  // False if the map is displaying multiple dates (e.g. 'Best Available')
  startEnabled: boolean;
}

export function TimeSlider(props: TimeSliderProps): JSX.Element {
  const { dateCtx } = useContext(Context);

  const [enabled, setEnabled] = useState(props.startEnabled);

  // Number of pixels the handle is offset from the left edge of the slider bar
  const [handleLeftOffset, setHandleLeftOffset] = useState(null);
  const [play, setPlay] = useState(false);
  // When freeze, time slider can not set the date context.
  // This is to ensure the minimal interval of time sliding.
  const [freeze, setFreeze] = useState(false);

  const firstUpdate = useRef(true);

  // TODO:
  // props.dates size check happens in ChartLoader.
  // Ideally it should be checked here with an early return.
  // However an early return before hooks definition is not a good practice.
  // The structure of this component requires more thoughts.
  const start = props.dates[0];
  const end = props.dates[props.dates.length - 1];
  const ticks = props.dates.slice(1, props.dates.length - 1);

  const handleResize = useCallback(() => {
    if (enabled) {
      setHandleLeftOffset(
        getOffset(start, end, props.currentDate, SLIDER_MARGIN, HANDLE_MARGIN)
      );
    }
  }, [enabled, start, end, props.currentDate]);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    if (freeze) {
      return;
    }
    if (props.currentDate < dateCtx.value) {
      return;
    }
    if (play) {
      setEnabled(true);
      let index = getIndex(props.dates, props.currentDate, props.startEnabled);
      index += 1;
      if (index === props.dates.length) {
        index = 0;
        // During the page loads, the cursor is usually in the middle or the
        // end of the time slider. The cursor should travel a full round of
        // the time span, which means it needs to reach the beginning of the
        // time span twice before it stops.
        if (!firstUpdate.current) {
          setPlay(false);
        }
        firstUpdate.current = false;
      }
      dateCtx.set(props.dates[index]);
      setFreeze(true);
      setTimeout(() => {
        setFreeze(false);
      }, INTERVAL_MS);
    }
  }, [
    props.dates,
    props.currentDate,
    props.startEnabled,
    dateCtx,
    play,
    freeze,
  ]);
  return (
    <div className="time-slider-container">
      <div className="time-slider">
        <span
          className="time-slider-left time-slider-current-date"
          style={{ width: `${end.length}ch` }}
        >
          {props.currentDate}
        </span>
        <div className="time-slider-break"></div>
        <div className="time-slider-left" onClick={(): void => setPlay(!play)}>
          {!play && (
            <i className="material-icons time-slider-play-button">play_arrow</i>
          )}
          {play && (
            <i className="material-icons time-slider-play-button">pause</i>
          )}
        </div>
        <span className="time-slider-left time-slider-start-date">{start}</span>
        <span className="time-slider-end-date">{end}</span>
        <div id="time-slider-slide">
          <svg className="time-slider-svg">
            <g>
              <line
                className="time-slider-track"
                x1={SLIDER_MARGIN}
                x2="100%"
              ></line>
              <line
                className="time-slider-track-inset"
                x1={SLIDER_MARGIN}
                x2="100%"
              ></line>
              {document.getElementById("time-slider-slide") &&
                ticks.map((date) => {
                  const offset =
                    getOffset(start, end, date, SLIDER_MARGIN, HANDLE_MARGIN) -
                    TICK_MARGIN;
                  return (
                    <line
                      className="time-slider-tick-mark"
                      x1={offset}
                      x2={offset}
                      y1={TICK_OFFSET}
                      y2={TICK_OFFSET + TICK_MARGIN}
                      key={date}
                    ></line>
                  );
                })}
              {enabled && (
                <line
                  className="time-slider-handle"
                  x1={handleLeftOffset || 0}
                  x2={handleLeftOffset + HANDLE_WIDTH || 0}
                ></line>
              )}
              {enabled && (
                <line
                  className="time-slider-handle-inset"
                  x1={handleLeftOffset || 0}
                  x2={handleLeftOffset + HANDLE_WIDTH || 0}
                ></line>
              )}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Get index of closest previous date from selected dates.
 * @param dates Array of selected dates
 * @param currentDate Current selected date
 */
function getIndex(
  dates: Array<string>,
  currentDate: string,
  startEnabled: boolean
): number {
  if (!startEnabled) {
    return -1;
  }
  for (let i = dates.length - 1; i > -1; i--) {
    if (dates[i] <= currentDate) {
      return i;
    }
  }
  return dates.length - 1;
}

/**
 * Get number of pixels the handle is offset from the left edge of the slider bar.
 * @param start Starting date
 * @param end Ending date
 * @param current Current date
 * @param sliderMargin Margin for slider in pixels
 * @param handleMargin Margin for slider handle in pixels
 */
function getOffset(
  start: string,
  end: string,
  current: string,
  sliderMargin: number,
  handleMargin: number
): number {
  const startDate = new Date(start).valueOf();
  const endDate = new Date(end).valueOf();
  const currentDate = new Date(current).valueOf();
  const dateDenom = endDate - startDate;
  const width = document.getElementById("time-slider-slide").offsetWidth;
  const ratio = Math.min(Math.max((currentDate - startDate) / dateDenom, 0), 1);
  return (width - sliderMargin) * ratio + handleMargin;
}
