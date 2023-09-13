import React, { Component } from 'react';
import { Menu } from 'antd';
import { createBrowserHistory } from "history";
import { NavLink } from 'react-router-dom';
import { routeDataCommonsConstants } from '../../../helper/Common/RoutePathConstants';
import { isMobile } from '../../../script/Commonfunctions';

const getMenuMode = () => {
    if (isMobile()) {
        return 'inline';
    } else {
        return 'horizontal';
    }
};

export default class TopNavigation extends Component {
    // all submenu keys of first level
    rootSubmenuKeys = [''];
    constructor(props) {
        super(props);
    }
    state = {
        current: 'home'
    };

    handleClick = e => {
        this.setState({ current: e.key });
    };

    componentDidMount() {
        const history = createBrowserHistory()
        let route = history.location.pathname
        if (route === routeDataCommonsConstants.COUNTRY) {
            this.setState({ current: "countries" })
        } else if (route === routeDataCommonsConstants.GOAL) {
            this.setState({ current: "goals" })
        }
        else if (route === routeDataCommonsConstants.SEARCH) {
            this.setState({ current: "search" })
        }
        else {
            this.setState({ current: "home" })
        }
    }

    
    render() {
        const { current } = this.state;
        return (
            <React.Fragment>
                <Menu
                    onClick={this.handleClick}
                    selectedKeys={[current]}
                    mode={getMenuMode()}
                    theme='dark'                    
                >
                    <Menu.Item key='home'>
                        <NavLink
                            to={`${routeDataCommonsConstants.HOME_PATH}`}
                            className='nav-link'
                            exact
                        >
                            Home
                        </NavLink>
                    </Menu.Item>
                    <Menu.Item key='countries'>
                        <NavLink
                            to={`${routeDataCommonsConstants.COUNTRY}`}
                            className='nav-link'
                            exact
                        >
                           Country
                        </NavLink>
                    </Menu.Item>
                    <Menu.Item key='goals'>
                        <NavLink
                            to={`${routeDataCommonsConstants.GOAL}`}
                            className='nav-link'
                            exact
                        >
                            Goal
                        </NavLink>
                    </Menu.Item>

                    <Menu.Item key='search'>
                        <NavLink
                            to={`${routeDataCommonsConstants.SEARCH}`}
                            className='nav-link'
                            exact
                        >
                            Search
                        </NavLink>
                    </Menu.Item>

                    {/*<Menu.Item key='blog'>
                        <NavLink
                            to={`${routeDataCommonsConstants.BLOG}`}
                            className='nav-link'
                            exact
                        >
                            Blog
                        </NavLink>
                    </Menu.Item>*/}
                </Menu>
            </React.Fragment>
        );
    }
}
