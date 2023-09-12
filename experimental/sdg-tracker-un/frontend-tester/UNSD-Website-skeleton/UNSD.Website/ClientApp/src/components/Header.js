import React, { Component } from 'react';
import TopNavigation from './molecule/TopNavigation';
import Global from './molecule/Global';
import Menu  from './molecule/Menu';
import MobileMenu from './molecule/MobileMenu';
import { isMobile } from '../script/Commonfunctions';
import { Layout } from 'antd';

export default class HeaderInfo extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isMobile: isMobile()
        };
    }
    render() {
        return (
            <React.Fragment>
                <div className="topnavigation">
                    <div className="container">
                        <TopNavigation />
                    </div>
                </div>
                <div className="header-section">
                    <div className="container">
                        <Global>
                            <MobileMenu visible={this.state.isMobile} />
                        </Global>
                    </div>
                </div>
                <div className="mainmenu" style={{ 'display': this.state.isMobile ? 'none' : 'block' }}>
                    <div className="container">
                        <Menu />
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

