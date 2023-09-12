import { Col, Row } from "antd";
import React from "react";
import { Image } from "../Image";
import parse from "html-react-parser";

/**
 * Display Type "onlyWidget"
 **/
export const DataCommonsBodyOnlyWidget = ({
  className,
  wType,
  wTitle,
  wVariable,
  wVariables,
  wPlace,
  wParentPlace,
  wChildPlaceType,
}) => {
  return (
    <>
      <Row className="d-flex w-100 align-content-center justify-content-center align-items-center mb-4">
        <Col
          span={24}
          className="d-flex justify-content-center align-items-center mb-2"
        >
          <GetDataCommonsWidget
            wType={wType}
            wTitle={wTitle}
            wVariable={wVariable}
            wVariables={wVariables}
            wPlace={wParentPlace}
            wParentPlace={wPlace}
            wChildPlaceType={wChildPlaceType}
          />
        </Col>
      </Row>
    </>
  );
};
/**
 * Display Type "onlyText"
 **/
export const DataCommonsBodyOnlyText = ({
  className,
  title,
  body,
}) => {
  return (
    <>
      <Row>
        {title ? (
          <Col span={24}>
            {" "}
            <h2 className="mb-3 mt-3">{title}</h2>{" "}
          </Col>
        ) : (
          <></>
        )}
        <Col span={24} className="textbottommargin">
          {" "}
          {parse(body)}{" "}
        </Col>
      </Row>
    </>
  );
};
/**
 * Display Type "WidgetText"
 **/
export const DataCommonsBodyWidgetText = ({
  className,
  title,
  body,
  wType,
  wTitle,
  wVariable,
  wVariables,
  wPlace,
  wParentPlace,
  wChildPlaceType,
}) => {
  return (
    <>
      <Row className="textbottommargin w-100 align-items-center">
        <Col
          xs={{ span: 24 }}
          md={{ span: 12 }}
          lg={{ span: 12 }}
        >
          <Row>
            <GetDataCommonsWidget
              wType={wType}
              wTitle={wTitle}
              wVariable={wVariable}
              wVariables={wVariables}
              wPlace={wPlace}
              wParentPlace={wParentPlace}
              wChildPlaceType={wChildPlaceType}
            />
          </Row>
        </Col>
        <Col
          className="pl-3"
          xs={{ span: 24 }}
          md={{ span: 12 }}
          lg={{ span: 12 }}
        >
          {title ? (
            <span>
              {" "}
              <h2
                className="card-imagetext-contnt"
                style={{ display: "inline" }}
              >
                {title}
              </h2>{" "}
            </span>
          ) : (
            <></>
          )}
          <span
            className="card-imagetext-contnt"
            style={{ display: "inline" }}
          >
            {parse(body)}
          </span>
        </Col>
      </Row>
    </>
  );
};
/**
 * Display Type "TextWidget"
 **/
export const DataCommonsBodyTextWidget = ({
  className,
  title,
  body,
  wType,
  wTitle,
  wVariable,
  wVariables,
  wPlace,
  wParentPlace,
  wChildPlaceType,
}) => (
  <>
    <Row className="textbottommargin w-100 align-items-center">
      <Col
        xs={{ span: 24 }}
        md={{ span: 12 }}
        lg={{ span: 12 }}
      >
        {title ? (
          <span>
            {" "}
            <h2
              className="card-imagetext-contnt"
              style={{ display: "inline" }}
            >
              {title}
            </h2>{" "}
          </span>
        ) : (
          <></>
        )}
        <span
          className="card-imagetext-contnt"
          style={{ display: "inline" }}
        >
          {parse(body)}
        </span>
      </Col>
      <Col
        xs={{ span: 24 }}
        md={{ span: 12 }}
        lg={{ span: 12 }}
      >
        <Row>
          <GetDataCommonsWidget
            wType={wType}
            wTitle={wTitle}
            wVariable={wVariable}
            wVariables={wVariables}
            wPlace={wPlace}
            wParentPlace={wParentPlace}
            wChildPlaceType={wChildPlaceType}
          />
        </Row>
      </Col>
    </Row>
  </>
);
/**
 * Display Type "EmbedUrl"
 **/
export const DataCommonsBodyEmbedded = ({ pageUrl }) => {
  return (
    <>
      <Row className={"w-100"}>
        <Col span={24}>
          <iframe
            src={pageUrl}
            allowFullScreen=""
            allow="geolocation"
            width="100%"
            height="800px"
            frameborder="0"
          >
            &nbsp;
          </iframe>
        </Col>
      </Row>
    </>
  );
};

/**
 *"Gets wizget according to type"
 **/
export const GetDataCommonsWidget = ({
  wType,
  wTitle,
  wVariable,
  wVariables,
  wPlace,
  wParentPlace,
  wChildPlaceType,
  wShowLowest,
  wMaxPlaces
}) => {
  const wizget = {
    map: (
      <datacommons-map
        Title={wTitle}
        Variable={wVariable}
        Variables={wVariables}
        Place={wPlace}
        ParentPlace={wParentPlace}
        ChildPlaceType={wChildPlaceType}
      />
    ),
    ranking: (
      <datacommons-ranking
        Title={wTitle}
        Variable={wVariable}
        Variables={wVariables}
        Place={wPlace}
        ParentPlace={wParentPlace}
        ChildPlaceType={wChildPlaceType}
        ShowLowest={wShowLowest}
      />
    ),
    bar: (
      <datacommons-bar
        wTitle={wTitle}
        wVariable={wVariable}
        wVariables={wVariables}
        wPlace={wPlace}
        wParentPlace={wParentPlace}
        wChildPlaceType={wChildPlaceType}
        wMaxPlaces={wMaxPlaces}
      />
    ),
    line: (
      <datacommons-line
        Title={wTitle}
        Variables={wVariables}
        Place={wPlace}
      />
    ),
  };
  return <> {wizget[wType]} </>;
};

/**
 *"Gets body according to type"
 **/
export const GetDataCommonsBody = ({
  type,
  className,
  title,
  body,
  wType,
  wTitle,
  wVariable,
  wVariables,
  wPlace,
  wParentPlace,
  wChildPlaceType,
  wShowLowest,
  wMaxPlaces,
  pageUrl,
}) => {
  const bodyType = {
    onlyWidget: (
      <DataCommonsBodyOnlyWidget
        className="textbottommargin align-items-center"
        wType={wType} 
        wTitle={wTitle}
        wVariable={wVariable}
        wVariables={wVariables}
        wPlace={wPlace}
        wParentPlace={wParentPlace}
        wChildPlaceType={wChildPlaceType}
        wShowLowest={wShowLowest}
        wMaxPlaces={wMaxPlaces}
      />
    ),
    onlyText: (
      <DataCommonsBodyOnlyText
        className="textbottommargin"
        title={title}
        body={body}
      />
    ),
    widgetText: (
      <DataCommonsBodyWidgetText
        className="textbottommargin"
        title={title}
        body={body}
        wType={wType} 
        wTitle={wTitle}
        wVariable={wVariable}
        wVariables={wVariables}
        wPlace={wPlace}
        wParentPlace={wParentPlace}
        wChildPlaceType={wChildPlaceType}
        wShowLowest={wShowLowest}
        wMaxPlaces={wMaxPlaces}
      />
    ),
    textWidget: (
      <DataCommonsBodyTextWidget
        className="textbottommargin"
        title={title}
        body={body}
        wType={wType} 
        wTitle={wTitle}
        wVariable={wVariable}
        wVariables={wVariables}
        wPlace={wPlace}
        wParentPlace={wParentPlace}
        wChildPlaceType={wChildPlaceType}
        wShowLowest={wShowLowest}
        wMaxPlaces={wMaxPlaces}
      />
    ),
    embeddedUrl: (
      <DataCommonsBodyEmbedded pageUrl={pageUrl} />
    ),
  };
  return <> {bodyType[type]} </>;
};
