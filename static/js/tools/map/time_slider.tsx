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

import React, { useEffect, useRef, useState } from "react";

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

  // Fetches data for slider dates when play is pressed
  onPlay(metahash: string, callback: () => void): void;

  // Updates map date to slider date
  updateDate(metahash: string, date: string): void;
}

export function TimeSlider(props: TimeSliderProps): JSX.Element {
  const INTERVAL_MS = 500;
  const SLIDER_MARGIN = 16;
  const HANDLE_WIDTH = 4;
  const HANDLE_MARGIN = SLIDER_MARGIN - HANDLE_WIDTH / 2;

  const start = props.dates[0];
  const end = props.dates[props.dates.length - 1];

  const [currentDate, setCurrentDate] = useState(
    props.startEnabled ? props.currentDate : "--"
  );
  const [enabled, setEnabled] = useState(props.startEnabled);
  const [index, setIndex] = useState(
    props.startEnabled ? getIndex(props.dates, props.currentDate) : -1
  );
  const [loaded, setLoaded] = useState(false);

  // Number of pixels the handle is offset from the left edge of the slider bar
  const [offset, setOffset] = useState(null);
  const [play, setPlay] = useState(true);
  const [timer, setTimer] = useState(null);

  const firstUpdate = useRef(true);

  useEffect(() => {
    setLoaded(false);
    setIndex(
      props.startEnabled ? getIndex(props.dates, props.currentDate) : -1
    );
    setCurrentDate(props.startEnabled ? props.currentDate : "--");
  }, [props.metahash]);

  useEffect(() => {
    if (enabled) {
      setOffset(
        getOffset(start, end, currentDate, SLIDER_MARGIN, HANDLE_MARGIN)
      );
    }
  }, [currentDate]);

  useEffect(() => {
    const handleResize = () => {
      if (enabled) {
        setOffset(
          getOffset(start, end, currentDate, SLIDER_MARGIN, HANDLE_MARGIN)
        );
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  useEffect(() => {
    // Don't update pre-selected date until user presses play
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
    if (index >= 0) {
      setCurrentDate(props.dates[index]);
      if (loaded) {
        props.updateDate(props.metahash, props.dates[index]);
      }
    }
    setEnabled(true);
    if (index === props.dates.length - 1) {
      setPlay(true);
      clearInterval(timer);
    }
  }, [index]);

  async function handlePlay() {
    if (play) {
      setLoaded(true);
      props.onPlay(props.metahash, () => {
        // Reset animation
        if (index === props.dates.length - 1) {
          setIndex(0);
        }
        setTimer(
          setInterval(() => {
            setIndex((index) => index + 1);
          }, INTERVAL_MS)
        );
      });
    } else {
      clearInterval(timer);
    }
    setPlay(!play);
  }

  return (
    <div className="time-slider-container">
      <div className="time-slider">
        <span
          className="time-slider-left time-slider-current-date"
          style={{ width: `${end.length}ch` }}
        >
          {currentDate}
        </span>
        <div className="time-slider-break"></div>
        <div className="time-slider-left" onClick={handlePlay}>
          {play && (
            <i className="material-icons time-slider-play-button">play_arrow</i>
          )}
          {!play && (
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
              {enabled && (
                <line
                  className="time-slider-handle"
                  x1={offset || 0}
                  x2={offset + HANDLE_WIDTH || 0}
                ></line>
              )}
              {enabled && (
                <line
                  className="time-slider-handle-inset"
                  x1={offset || 0}
                  x2={offset + HANDLE_WIDTH || 0}
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
function getIndex(dates: Array<string>, currentDate: string): number {
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
