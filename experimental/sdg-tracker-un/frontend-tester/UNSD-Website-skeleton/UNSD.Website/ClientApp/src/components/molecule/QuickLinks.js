import React from "react";
import { ListView } from "../../components/atom/ListView/SimpleList";
import { commonConstants } from "../../helper/Common/CommonConstants";
import { CheckNullOrEmptyValue } from "../../script/Commonfunctions";
import { routePathConstants } from "../../helper/Common/RoutePathConstants";

export function QuickLinks(props) {
  const data = [
    //{
    //    title: 'Upcoming Sessions - 53rd session(1 - 4 March 2022)',
    //    url: '',
    //    target: '',
    //    show: props.show == undefined ? commonConstants.SETTRUE : props.show
    //},

    {
      title: "Current session: 54th session",
      url: `${routePathConstants.STATCOM_SESSION_PATH}${commonConstants.CURRENT_SESSION}`,
      target: "",
      show: commonConstants.SETTRUE,
    },
    {
      title: "Inter-sessional activities",
      url: `${routePathConstants.STATCOM_INTER_SESSION_ACTIVITIES_PATH}`,
      target: "",
      show: commonConstants.SETTRUE,
    },
    {
      title: "Decisions",
      url: `${routePathConstants.STATCOM_DECISION_PATH}`,
      target: "",
      show: commonConstants.SETTRUE,
    },
    {
      title: "All past sessions",
      url: `${routePathConstants.STATCOM_PAST_SESSION_PATH}`,
      target: "",
      show: commonConstants.SETTRUE,
    },
  ];

  return (
    <React.Fragment>
      <h2 className="mb-3">Quick Links</h2>
      <ListView
        data={
          props.data
            ? props.data
            : data.filter((s) => s.show == commonConstants.SETTRUE)
        }
        className="mb-3"
      />
    </React.Fragment>
  );
}
