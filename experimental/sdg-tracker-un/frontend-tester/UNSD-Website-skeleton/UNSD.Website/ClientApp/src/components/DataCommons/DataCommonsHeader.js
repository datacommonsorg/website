import React, { Component, Fragment } from 'react';
import TopNavigation from '../molecule/DataCommons/topnavigation';
import Global from '../molecule/DataCommons/global';
import Menu from '../molecule/DataCommons/menu';
import MobileMenu from '../molecule/DataCommons/mobilemenu';
import { isMobile } from '../../script/Commonfunctions';
import { Layout } from 'antd';

export default class DataCommonsHeaderInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            IsMobile: isMobile()
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
                            <MobileMenu visible={this.state.IsMobile} />
                        </Global>
                    </div>
                </div>
                <div className="mainmenu" style={{ 'display': this.state.IsMobile ? 'none' : 'block' }}>
                    <div className="container">
                        <Menu />
                    </div>
                </div>
            </React.Fragment>
            
        );
    }
}
