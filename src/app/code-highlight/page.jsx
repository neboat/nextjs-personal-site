import * as React from "react"
import { CodeInputOutput } from "./code-input-output"
import Description from "./code-highlight-description.mdx"
import Layout, { getLastModified } from "@/components/layout"

export const metadata = {
    title: 'Code Highlighter',
    description: 'Tool to generate highlighted C/C++ and Cilk code for slides',
}

const CodeHighlightPage = () => {
    return (
        <Layout lastModified={getLastModified('/src/app/code-highlight/page.jsx')} mainClassName="w-full mb-4" articleClassName="max-w-full!">
            <h1>Code Highlighter</h1>
            <CodeInputOutput />
            <Description />
        </Layout>
    )
}

export default CodeHighlightPage
