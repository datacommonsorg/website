import React, { Component } from 'react'
import { Badge } from 'antd';

export default class ComplianceBadgeControl extends Component {
    constructor(props) {
        super(props)
    }
    render() {
        return (
            <>
                {this.props.type == null || this.props.type == "Questionaire" &&
                    <>
                        <Badge status="success" text="Full Compliance" />
                        <Badge status="warning" text="Partial Compliance" />
                        <Badge status="error" text="No Compliance" />
                        <Badge status="default" text="Not Assessed" />
                    </>
                }

                {this.props.type == "Elements" &&
                    <>
                        <Badge status="success" text="Full Compliance" />
                        <Badge status="warning" text="Partial Compliance" />
                        <Badge status="error" text="No Compliance" />
                        <Badge status="default" text="Not Applicable" />
                    </>
                }
            </>
        )
    }
}