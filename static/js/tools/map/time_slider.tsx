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
  onPlay(metahash: string, callback: () => void): any;

  // Updates map date to date on slider
  updateDate(metahash: string, date: string): any;
}

export function TimeSlider(props: TimeSliderProps): JSX.Element {
  const INTERVAL_MS = 500;
  const SLIDER_MARGIN = 16;
  const HANDLE_WIDTH = 4;
  const HANDLE_MARGIN = SLIDER_MARGIN - (HANDLE_WIDTH / 2);

  const start = props.dates[0];
  const end = props.dates[props.dates.length - 1];
  const startDate = new Date(start).valueOf();
  const endDate = new Date(end).valueOf();
  const dateDenom = endDate - startDate;

  const [currentDate, setCurrentDate] = useState(
    props.startEnabled ? props.currentDate : "--"
  );
  const [enabled, setEnabled] = useState(props.startEnabled);
  const [index, setIndex] = useState(
    props.startEnabled ? getIndex(props.currentDate) : -1
  );
  const [loaded, setLoaded] = useState(false);

  // Number of pixels the handle is offset across the slider bar
  const [offset, setOffset] = useState(null);
  const [play, setPlay] = useState(true);
  const [timer, setTimer] = useState(null);

  const firstUpdate = useRef(true);

  useEffect(() => {
    setLoaded(false);
    setIndex(props.startEnabled ? getIndex(props.currentDate) : -1);
    setCurrentDate(props.startEnabled ? props.currentDate : "--");
  }, [props.metahash]);

  useEffect(() => {
    setOffset(getOffset(currentDate));
  }, [currentDate, getOffset]);

  useEffect(() => {
    function handleResize() {
      setOffset(getOffset(currentDate));
    }
    window.addEventListener("resize", handleResize);
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
    if (index == props.dates.length - 1) {
      setPlay(true);
      clearInterval(timer);
    }
  }, [index]);

  function getIndex(currentDate: string): number {
    // Get closest previous date from selected dates
    for (let i = props.dates.length - 1; i > -1; i--) {
      if (props.dates[i] <= currentDate) {
        return i;
      }
    }
    return props.dates.length - 1;
  }

  function getOffset(current: string): number {
    if (!enabled) {
      return;
    }
    const width = document.getElementById("slider").offsetWidth;
    const currentDate = new Date(current).valueOf();
    const ratio = Math.min(
      Math.max((currentDate - startDate) / dateDenom, 0),
      1
    );
    return (width - SLIDER_MARGIN) * ratio + HANDLE_MARGIN;
  }

  async function handlePlay() {
    if (play) {
      setLoaded(true);
      await props.onPlay(props.metahash, () => {
        // Reset animation
        if (index == props.dates.length - 1) {
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
    <div id="time-slider-container">
      <div id="time-slider">
        <span
          className="slider-left"
          id="current-date"
          style={{ width: `${end.length}ch` }}
        >
          {currentDate}
        </span>
        <div className="slider-break"></div>
        <div className="slider-left" onClick={handlePlay}>
          {play && <i className="material-icons play-button">play_arrow</i>}
          {!play && <i className="material-icons play-button">pause</i>}
        </div>
        <span className="slider-left" id="start-date">
          {start}
        </span>
        <span id="end-date">{end}</span>
        <div id="slider">
          <svg id="svg">
            <g>
              <line className="track" x1={SLIDER_MARGIN} x2="100%"></line>
              <line className="track-inset" x1={SLIDER_MARGIN} x2="100%"></line>
              {enabled && (
                <line
                  className="handle"
                  x1={offset || 0}
                  x2={offset + HANDLE_WIDTH || 0}
                ></line>
              )}
              {enabled && (
                <line
                  className="handle-inset"
                  id="handle"
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
