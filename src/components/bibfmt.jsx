import * as React from "react"

const formatURL = (paper) => {
    if ('DOI' in paper) {
        return (
            <div className="bg-blue-500 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-500 border border-blue-700">
                <span className="block text-md px-1">
                    <a className="text-white" href={`https://doi.org/` + paper.DOI}>DOI</a>
                </span>
            </div>
        )
    }
    if ('URL' in paper) {
        return (
            <div className="bg-blue-500 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-500 border border-blue-700">
                <span className="block text-md px-1">
                    <a className="text-white" href={paper.URL}>URL</a>
                </span>
            </div>
        )
    }
    return ''
}

const formatHowPublished = (paper) => {
    if (paper.type === "thesis") {
        if (paper.genre === "phdthesis") {
            return <span>Ph.D. thesis.  {paper.publisher}</span>
        }
        if (paper.genre === "mathesis") {
            return <span>Masters thesis.  {paper.publisher}</span>
        }
    }
    var issue = ''
    if (paper.volume) {
        issue = `, ${paper.volume}(${paper.issue})`
    }
    if (paper.page) {
        issue = issue + `, ${String(paper.page).replace('-', '\u2013')}`
    }
    return <span>In <i>{paper["container-title"]}</i>{issue}</span>
}

const formatAnnotation = (paper) => {
    if (!paper.annote) {
        return ''
    }
    return <span className="block font-semibold text-rose-700 dark:text-rose-400" dangerouslySetInnerHTML={{ __html: ' ' + paper.annote + '.' }}></span>
}

export { formatURL, formatHowPublished, formatAnnotation }