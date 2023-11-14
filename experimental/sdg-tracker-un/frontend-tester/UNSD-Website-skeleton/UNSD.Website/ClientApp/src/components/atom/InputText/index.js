import React from "react";
import { Input as CustomInput } from "antd";
export function Input(props) {
  return (
    <React.Fragment>
      <CustomInput
        placeholder={props.placeholder}
        id={props.id}
        name={props.name}
        onChange={props.onChange}
        value={props.value}
      ></CustomInput>
    </React.Fragment>
  );
}
