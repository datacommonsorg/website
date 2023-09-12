import React from 'react';
import { Dropdown, Button, Menu } from 'antd';
import { FileType } from '../../../script/Commonfunctions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDown, faDownload } from '@fortawesome/free-solid-svg-icons';

export function DropdownMultiLinks(props) {
    const menu = (
        <Menu>
            {
                props.item.map((res, index) => {
                    let icon = FileType(res)
                    return <Menu.Item key={`${index + 1}`} >
                        <a target="_blank" href={res.file_Url} rel="noreferrer">
                            {`${res.language}`}
                        </a>
                    </Menu.Item>
                })
            }
        </Menu>
    );
    return (
        <React.Fragment>
            <Dropdown overlay={menu} trigger={['click']}>
                <Button type={"primary"} shape={"round"} className={props.className}>
                    <FontAwesomeIcon icon={faDownload} /> {props.title} <FontAwesomeIcon icon={faAngleDown} className='ml-1' />
                </Button>
            </Dropdown>
        </React.Fragment>
    );
}