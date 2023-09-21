import React, { Component } from 'react';
import { isMobile } from '../../script/Commonfunctions';
import Global from '../molecule/DataCommons/global';
import Menu from '../molecule/DataCommons/menu';
import MobileMenu from '../molecule/DataCommons/mobilemenu';
import TopNavigation from '../molecule/DataCommons/topnavigation';

export default class DataCommonsHeaderInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            IsMobile: isMobile()
        };
    }
   

    render() {
       
        return (

            <div className="headercontainer">
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
            </div>
            
        );
    }
}
