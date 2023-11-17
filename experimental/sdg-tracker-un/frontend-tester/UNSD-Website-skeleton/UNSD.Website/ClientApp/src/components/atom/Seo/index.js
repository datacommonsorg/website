import React from "react";
import { Helmet } from "react-helmet"

export function Seo({ title, description, image, url}) {
  return (
    <React.Fragment>
          <Helmet>

              <title>{title}</title>
              <meta name="description" content={description} />

              {image ? <meta property="og:image" content={image} />: ''}
              <meta property="og:image:width" content="213" />
              <meta property="og:title" content={title} />
              {description ?<meta property="og:description" content={description} />: ''}
              {url ? <meta property="og:url" content={url} /> : ''}

              {image ? <meta name="twitter:image" content={image} /> : ''}
              <meta name="twitter:image:width" content="213" />
              <meta name="twitter:title" content={title} />
              {description ? <meta name="twitter:description" content={description} /> : ''}
              <meta name="twitter:creator" content="@unstats" />
              {url ? <meta name="twitter:url" content={url} /> : ''}

          </Helmet>
    </React.Fragment>
  );
}
