import React from "react";
import { List as CustomList } from "antd";
import { CheckNullOrEmptyValue } from "../../../../script/Commonfunctions";
import { Image } from "../../Image";

export const ListView = ({ data, header, className, itemLayout, childrenClassName }) => {

  return (
    <React.Fragment>
      <CustomList
        header={
                    !CheckNullOrEmptyValue(header) ? <div>{header}</div> : ""
        }
                className={className}
                itemLayout={itemLayout}
                dataSource={data}
        renderItem={(item) => (
                    <CustomList.Item className="circle p-0 pb-1">
            <a
              title={item.tooltip}
              href={
                !CheckNullOrEmptyValue(item.url)
                  ? item.url
                  : "javascript:void(0)"
              }
              target={item.target}
              rel="noopener noreferrer"
            >
              {item.title == null ? (
                <Image
                  image={item.image}
                  className={"img-responsive mt-3 mb-3"}
                />
              ) : (
                item.title
              )}
            </a>
                        {
                            item.children &&
                            <CustomList
                                header={
                                    !CheckNullOrEmptyValue(header) ? <div>{header}</div> : ""
                                }
                                className={childrenClassName}
                                itemLayout={itemLayout}
                                dataSource={item.children}
                                renderItem={(item) => (
                                    <CustomList.Item className="circle p-0 pb-1">
                                        <a
                                            title={item.tooltip}
                                            href={
                                                !CheckNullOrEmptyValue(item.url)
                                                    ? item.url
                                                    : "javascript:void(0)"
                                            }
                                            target={item.target}
                                            rel="noopener noreferrer"
                                        >
                                            {item.title == null ? (
                                                <Image
                                                    image={item.image}
                                                    className={"img-responsive mt-3 mb-3"}
                                                />
                                            ) : (
                                                item.title
                                            )}
                                        </a>
                                    </CustomList.Item>
                                )}
                            ></CustomList>
                        }
          </CustomList.Item>
        )}
      ></CustomList>
    </React.Fragment>
  );
};
