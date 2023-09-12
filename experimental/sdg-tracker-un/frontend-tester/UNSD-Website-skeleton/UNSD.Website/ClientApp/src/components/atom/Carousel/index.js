import React from "react";
import { Carousel as CustomCarousel } from "antd";

export function Carousel({
  className,
  autoplay = true,
  dotPosition,
  children,
  speed = 500
}) {
  return (
    <React.Fragment>
      <CustomCarousel
        className={className}
        autoplay={autoplay}
        dotPosition={dotPosition}
        speed={speed}
      >
        {children}
      </CustomCarousel>
    </React.Fragment>
  );
}
