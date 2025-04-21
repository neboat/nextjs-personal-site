'use client'

import * as React from "react"
import Cite from "citation-js"
import { formatHowPublished, formatURL } from "./bibfmt"
import { copyIcon, copiedIcon } from "./copybtn"

const copyToClipboard = str => {
    if (navigator.clipboard) {
        // Most modern browsers support the Navigator API
        navigator.clipboard.writeText(str).then(
            function () {
                // console.log("Copying to clipboard was successful!");
            },
            function (err) {
                console.error("Could not copy text: ", err);
            }
        );
    } else {
        // Fallback using the deprecated `document.execCommand`.
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#browser_compatibility
        const cb = e => {
            e.clipboardData.setData("text/plain", str);
            e.preventDefault();
        };
        document.addEventListener("copy", cb);
        document.execCommand("copy");
        document.removeEventListener("copy", cb);
    }
};

const getFormatting = (paper) => {
    const paperFormatting = 'border-l-stone-500 dark:border-l-stone-500'
    const thesisFormatting = 'border-l-yellow-500 dark:border-l-yellow-500'
    const awardedFormatting = 'border-l-rose-500 dark:border-l-rose-500'
    if (paper.type === "thesis")
        return thesisFormatting
    if (paper.annote)
        return awardedFormatting
    return paperFormatting
}

const BibEntry = ({ id, authors, year, title, howPublished, available, annote, bibtex, classExtra, ...props }) => {
    const [isCopied, setIsCopied] = React.useState(false)
    return (
        <div key={id} className='m-1'>
            <div className={'border border-l-2 bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600 rounded-xs px-4 py-2 ' + classExtra} {...props}>
                {authors.map(a => {
                    return `${a.given} ${a.family}`
                }).join(', ')}.{' '}
                {year}.{' '}
                <span className="font-semibold">{title}</span>.{' '}
                {howPublished}.{' '}
                {annote}
                <div className="mt-1 flex gap-x-1">
                    {available}
                    {/* <details><summary>BibTeX</summary>{bibtex}</details> */}
                    <button className="text-md px-1 text-white bg-blue-500 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-500 border border-blue-700"
                        onClick={() => {
                            copyToClipboard(bibtex)
                            setIsCopied(true)
                            setTimeout(() => setIsCopied(false), 1000)
                        }}>
                        <span className="align-baseline">{isCopied ? copiedIcon : copyIcon} Copy BibTeX</span>
                    </button></div>
            </div>
        </div>
    )
}

const Bib = ({ paper, idprefix = '', annote = '', classExtra = '', ...props }) => (
    <BibEntry
        id={idprefix + paper.id}
        authors={paper.author}
        year={paper.issued["date-parts"][0][0]}
        title={paper.title}
        howPublished={formatHowPublished(paper)}
        available={formatURL(paper)}
        annote={annote}
        bibtex={Cite(paper).format('bibtex')}
        classExtra={getFormatting(paper) + ' ' + classExtra}
        {...props}
    />
)

export { BibEntry, Bib }