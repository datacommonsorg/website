import React, { Component } from 'react'
import { Badge } from 'antd';

export default class ScoreBadgeControl extends Component {

    render() {
        return (
            <>
                <Badge status="error" text="0 - 25" />
                <Badge status="warning" text="25 - 50" />
                <Badge color="#FFD95E" text="50 - 75" />
                <Badge status="success" text="75 - 100" />
            </>
        )
    }
}