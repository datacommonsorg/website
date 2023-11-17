import React from "react";
import { List as CustomList } from "antd";
import { CheckNullOrEmptyValue } from "../../../../script/Commonfunctions";

import {
    FilePdfFilled,
    FileWordFilled,
    LinkOutlined,
    FileExcelFilled,
    FilePptFilled,
} from '@ant-design/icons';

export function EventsLink(props) {
    const DocumentType = (data) => {
        if (data.url.toLowerCase().indexOf(".pdf") > 0)
            return <FilePdfFilled />
        else if (data.url.toLowerCase().indexOf(".doc") > 0 || data.url.toLowerCase().indexOf(".docx") > 0)
            return <FileWordFilled />
        else if (data.url.toLowerCase().indexOf(".xls") > 0 || data.url.toLowerCase().indexOf(".xlsx") > 0)
            return <FileExcelFilled />
        else if (data.url.toLowerCase().indexOf(".ppt") > 0 || data.url.toLowerCase().indexOf(".pptx") > 0)
            return <FilePptFilled />
        else
            return <LinkOutlined />
    }
    return (
        <React.Fragment>
            <CustomList
                header={
                    !CheckNullOrEmptyValue(props.header) ? <div>{props.header}</div> : ""
                }
                className={props.className}
                itemLayout={props.itemLayout}
                dataSource={props.data}
                renderItem={(item) => (
                    <CustomList.Item className="justify-content-start p-0 pb-1">
                        <span className="mx-2"><DocumentType url={item.url} /></span>
                        <a
                            title={item.tooltip}
                            href={
                                !CheckNullOrEmptyValue(item.url)
                                    ? item.url
                                    : "javascript:void(0)"
                            }
                            target={"_blank"}
                            rel="noopener noreferrer"
                        >
                            <span className="text-left">
                                {item.title}
                            </span>
                        </a>
                    </CustomList.Item>
                )}
            ></CustomList>
        </React.Fragment>
    );
}
