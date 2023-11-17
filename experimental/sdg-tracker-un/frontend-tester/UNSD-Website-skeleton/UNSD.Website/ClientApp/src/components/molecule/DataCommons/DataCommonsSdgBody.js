import { Row, Col, Spin, Button } from "antd";
import React from "react";
import { useState } from "react";
import { useEffect } from "react";

import { getDataCommonsSdgDetails } from "../../../services/DataCommonsService";
import { GetDataCommonsBody } from "../../atom/DataCommons/DataCommonsBody";

import { Seo } from "../../atom/Seo";

export const DataCommonsSdgBody = (props) => {
  const [sdgData, setsdgData] = useState(null);

  useEffect(() => {
    (async () => {
      //console.log(props);
      const Id = props.Id;
      var sdgdata = await getDataCommonsSdgDetails(Id);
      setsdgData(sdgdata);
      console.log(sdgdata);
    })();
  }, []);
  return (
    <>
      {sdgData ? (
        <>
          <Seo
            title={sdgData.title}
            description={sdgData.title} //may be some detail in json?
            image={sdgData.icon}
            url={"https://unstats.un.org"} // define later
          />

          <Row className="my-4">
            {sdgData.sections.map((x, i) => (
              <GetDataCommonsBody
                type={x.layout}
                title={x.blurb.title}
                body={x.blurb.body}
                wType={x.widget.type}
                wTitle={x.widget.title}
                wVariable={x.widget.variable}
                wVariables={x.widget.variables}
                wPlace={x.widget.place}
                wParentPlace={x.widget.parentPlace}
                wChildPlaceType={x.widget.childPlaceType}
                pageUrl={""}
                className={""}
              />
            ))}
          </Row>
        </>
      ) : (
        <Spin tip={"Loading Sdg"} />
      )}
    </>
  );
};
