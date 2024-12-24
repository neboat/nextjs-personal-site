import * as React from "react"
import Cite from "citation-js"
import { Bib } from "@/components/bibentry"
import { formatAnnotation } from "@/components/bibfmt"
import Layout, { getLastModified } from "@/components/layout"

export const metadata = {
    title: 'Papers',
}

import MyBib from '@/bib/mypapers.bib'
const MyPapers = new Cite(MyBib.toString())

const featuredPapers = ["SchardlLe23", "LeisersonThEm20", "SchardlMoLe17"]

const PapersPage = () => {
    // console.log(MyPapers)
    MyPapers.data.sort((a, b) => {
        const compareYearsIssued = b.issued["date-parts"][0][0] - a.issued["date-parts"][0][0]
        if (compareYearsIssued !== 0)
            return compareYearsIssued
        const compareMonthsIssued = a.issued["date-parts"][0][1] - b.issued["date-parts"][0][1]
        return compareMonthsIssued
    })
    return (
        <Layout lastModified={getLastModified(`/src/app/papers/page.jsx`)}>
            <h1>Papers</h1>
            <h2>Featured papers</h2>
            {MyPapers.data.filter(paper => featuredPapers.includes(paper["citation-key"])).map(paper => {
                return <Bib key={'featured-' + paper.id} paper={paper} idprefix="featured-" annote={formatAnnotation(paper)} />
            })}
            <h2>All papers</h2>
            {MyPapers.data.map(paper => {
                return <Bib key={paper.id} paper={paper} annote={formatAnnotation(paper)} />
            })}
        </Layout>
    )
}

export default PapersPage