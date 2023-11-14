import React, { Component } from "react";
import { Tag } from "antd";
import { commonConstants } from "../../../helper/Common/CommonConstants";

export class ReadMoreAndLess extends Component {
    constructor(props) {
        super(props);
        this.state = {
            max: commonConstants.READMORE_MAX,
            tags: [],
            moreValue: this.props.tags.length - commonConstants.READMORE_MAX,
            dafaultMax: commonConstants.READMORE_MAX,
        };
    }

    onTagMoreClick = () => {
        this.setState({
            max: this.props.tags.length
        })
    }

    onTagClick = (value, type) => {
        this.props.onTagCallback(value,type);
    }

    componentDidMount() {
        this.setState({
            tags: this.props.tags
        });
    }

    componentDidUpdate(prevProps) {
        if (JSON.stringify(prevProps.tags) !== JSON.stringify(this.props.tags)) {
            this.setState({
                tags: this.props.tags,
                moreValue: this.props.tags.length - commonConstants.READMORE_MAX,
            });
        }
    }

    render() {
        return (
            this.state.tags.slice(0, this.state.max).map((item, index) => {
                if (this.state.max == this.state.dafaultMax) {
                    if (this.props.stausEvent || this.props.stausEvent == undefined) {
                        return index < (this.state.max - 1) ? <Tag className="title-cursor-pointer" onClick={() => this.onTagClick(item,"tag")}>{item}</Tag> :
                            this.state.moreValue == 0 ? <Tag className="title-cursor-pointer" onClick={() => this.onTagClick(item, "tag")}>{item}</Tag> : <span><Tag className="title-cursor-pointer" onClick={events => this.onTagClick(item, "tag")}>{item}</Tag><Tag className="title-cursor-pointer" onClick={events => this.onTagMoreClick()}> {`+${this.state.moreValue} more`} </Tag> </span>
                    }
                    else {
                        return index < (this.state.max - 1) ? <Tag>{item}</Tag> : <span><Tag>{item}</Tag><Tag className="title-cursor-pointer" onClick={events => this.onTagMoreClick()}> {`+${this.state.moreValue} more`} </Tag> </span>
                    }
                }
                else {
                    return this.props.stausEvent || this.props.stausEvent == undefined ? <Tag className="title-cursor-pointer" onClick={events => this.onTagClick(item, "tag")}>{item}</Tag> : <Tag>{item}</Tag>
                }
            })
        );
    }
}
