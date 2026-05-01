'use client'

import React from "react";
import { MyHighlight } from "./cilkbook-codeblock"

export const Code = props => {
    // console.log(props)
    const className = props.children.props.className || "";
    const code = props.children.props.children.trim();
    const language = className.replace(/language-/, "");
    // const rawlines = props.children.props.highlights || "";
    // console.log(rawlines)
    return (
        <div className='m-0'>
            <div className="overflow-auto">
                <MyHighlight code={code} language={language} theme="dark-plus" className={'p-0 m-0 prose-pre ' + className} >
                    {( html ) => (
                        <div dangerouslySetInnerHTML={{ __html: html }} />
                    )}
                </MyHighlight>
            </div>
        </div>
    );
}