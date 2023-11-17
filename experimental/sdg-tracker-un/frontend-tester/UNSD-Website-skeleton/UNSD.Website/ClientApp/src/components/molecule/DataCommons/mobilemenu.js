import React, { Component, Fragment } from 'react';
import { Menu, Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import TopNavigation from './menu.js';
import { commonConstants } from '../../../helper/Common/ResourceCatalog/CommonConstants';


export default class MobileMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isVisible: this.props.visible,
            showDrawer: commonConstants.SETFALSE,
        };
    }
    showDrawer = () => {
        this.setState({ showDrawer: commonConstants.SETTRUE })
    };

    onClose = () => {
        this.setState({ showDrawer: commonConstants.SETFALSE })
    };

    render() {
        return (this.state.isVisible ? <Fragment>
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
                <TopNavigation onClick={this.onClose} />
            </Drawer>
        </Fragment> : <Fragment></Fragment>)
    }
}
