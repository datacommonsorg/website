import React, { Component, Fragment } from 'react';
import { Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import Menu from './Menu';
import { commonConstants } from '../../helper/Common/CommonConstants';

export default class MobileMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showDrawer: commonConstants.SETFALSE
        };
    }
    showDrawer = () => {

        this.setState({ showDrawer: commonConstants.SETTRUE })
    };

    onClose = () => {
        this.setState({ showDrawer: commonConstants.SETFALSE })
    };

    render() {
        return (this.props.visible ? <Fragment>
            <Button type="text" onClick={this.showDrawer} className="menu-icon">
                <MenuOutlined />
            </Button>
            <Drawer
                placement="right"
                width={300}
                closable={commonConstants.SETTRUE}
                onClose={this.onClose}
                visible={this.state.showDrawer}
                className="mobile-menu-drawer-content"
            >
                <Menu onClick={this.onClose} />
            </Drawer>
        </Fragment> : <Fragment></Fragment>)
    }
}
