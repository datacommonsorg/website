// TabIcon.js
import React from "react";

const TabIcon = ({ iconSrc, alttext, text }) => {
  return (
    <div>
      <div className="sidebar-link-icon" style={{backgroundColor:"#fff"}}>
        <img src={iconSrc} style={{ width: "45px" }} alt={alttext} />
      </div>
      <div className="sidebar-link-text text-wrap" style={{ width: "6rem" }}>
        {text}
      </div>
    </div>
  );
};

export default TabIcon;
