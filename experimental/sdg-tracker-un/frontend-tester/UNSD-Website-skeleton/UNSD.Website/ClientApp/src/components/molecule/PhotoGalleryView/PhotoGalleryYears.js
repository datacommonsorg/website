import React from 'react';
import { Link } from 'react-router-dom';


export default function PhotoGalleryYears(props) {

    let onTagClick = (event,tagObj) => {
        event.preventDefault()
        props.tagClick(tagObj);
    };
    return (

        <div key={props.data.index} >
            <Link key={props.data.index} onClick={(event) => onTagClick(event,props.data.year)}>
                {props.data.year}
            </Link>
        </div>
    )
}



