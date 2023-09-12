import React, { Component } from 'react';
import { Avatar, Input } from 'antd';

const { Search } = Input;

export class SearchBar extends Component {

    onSearch = value => {
        this.props.handleSearchInput(value)
    }

    onChange = event => {
        this.props.onChangeSearchInput(event.target.value);
    }

    render() {
        return (
            <div className="search-wrap">
                <Avatar shape="square" src="./images/Nqaf/Cover-DESA-UNNQAF-Manual.svg" />
                <Search placeholder="input search text" onChange={this.onChange} onSearch={this.onSearch} className="mt-10 search-input" />
            </div>
        );
    }
}