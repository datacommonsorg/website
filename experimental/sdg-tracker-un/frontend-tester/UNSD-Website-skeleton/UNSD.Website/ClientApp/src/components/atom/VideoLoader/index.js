import React from "react";
import { useRef } from "react";
import useIntersectionObserver from "@react-hook/intersection-observer"; //helps loading the content on demad
import { Row, Col } from "antd";

const LazyIframe = ({ url, title }) => {
  const containerRef = useRef();
  const lockRef = useRef(false);
  const { isIntersecting } = useIntersectionObserver(containerRef);
  if (isIntersecting && !lockRef.current) {
    lockRef.current = true;
  }
  return (
      <div ref={containerRef} className="mr-2">
      {lockRef.current && (
        <iframe
          title={title}
          src={url}
          height="250"
          frameBorder="0"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen="allowfullscreen"
        ></iframe>
      )}
    </div>
  );
};

export default LazyIframe;
