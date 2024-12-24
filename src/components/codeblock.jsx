'use client'

import React from "react";
import { MyHighlight } from "./cilkbook-codeblock"

// const copyToClipboard = str => {
//     if (navigator.clipboard) {
//         // Most modern browsers support the Navigator API
//         navigator.clipboard.writeText(str).then(
//             function () {
//                 console.log("Copying to clipboard was successful!");
//             },
//             function (err) {
//                 console.error("Could not copy text: ", err);
//             }
//         );
//     } else if (window.clipboardData) {
//         // Internet Explorer
//         window.clipboardData.setData("Text", str);
//     }
// };

export const Code = props => {
    // console.log(props)
    const className = props.children.props.className || "";
    const code = props.children.props.children.trim();
    const language = className.replace(/language-/, "");
    // const rawlines = props.children.props.highlights || "";
    // console.log(rawlines)
    // const [isCopied, setIsCopied] = React.useState(false)
    return (
        <div className='m-0'>
            {/* <button className="text-md"
                onClick={() => {
                    copyToClipboard(code)
                    setIsCopied(true)
                    setTimeout(() => setIsCopied(false), 1000)
                }}>
                {isCopied ? "🎉 Copied!" : "Copy"}
            </button> */}
            <div className="overflow-auto">
                <MyHighlight code={code} language={language} theme="slack-dark" className={'p-0 m-0 prose-pre ' + className} >
                    {( html ) => (
                        <div dangerouslySetInnerHTML={{ __html: html }} />
                    )}
                </MyHighlight>
            </div>
        </div>
    );
}