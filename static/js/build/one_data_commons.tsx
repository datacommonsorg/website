import React, { ReactElement } from "react";

import MediaText from "../components/content/media_text";
import SlideCarousel from "../components/elements/slide_carousel";

const OneDataCommons = (): ReactElement => {
  const createSlides = (): ReactElement[] => {
    return [
      <MediaText
        key={0}
        mediaType="image"
        mediaSource="images/content/build/ONEData.png"
      >
        <p>
          <a
            href="https://datacommons.one.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ONE Data Commons
          </a>
          , a collaborative platform combining the in-depth data and research
          from the ONE Campaign with the vast repository of Google&rsquo;s Data
          Commons, offers unparalleled insights into global issues spanning
          economics, climate, health, demographics, and beyond.
        </p>
      </MediaText>,
    ];
  };

  const slides = createSlides();

  return (
    <section id="one-data-commons" className="one-data-commons">
      <div className="container">
        <header className="header">
          <h3>ONE Data Commons</h3>
        </header>
        <SlideCarousel slides={slides} />
      </div>
    </section>
  );
};

export default OneDataCommons;
