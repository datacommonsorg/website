import React, { useContext } from 'react';
import { Select as CustomSelect, Tooltip } from "antd";
import { textAsString } from '../../../containers/Language'
import { LanguageContext } from "../../../containers/Language";
const Option = Select;

export function Select(props) {
    const { userLanguage } = useContext(LanguageContext);
  return (
    <React.Fragment>
      <CustomSelect
        className={props.className}
        style={props.style}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue}
        onChange={props.onChange}
      >
        {props.option.map((item, index) => {
          return (
            <Option key={index} value={item.value}>
                            {
                                props.enableTooltip && textAsString(item.label, userLanguage).length > 23
                                    ? <Tooltip title={textAsString(item.label, userLanguage)} key={index}>
                                        {textAsString(item.label, userLanguage)}
                                    </Tooltip>
                                    : textAsString(item.label, userLanguage)
                            }
            </Option>
          );
        })}
      </CustomSelect>
    </React.Fragment>
  );
}
