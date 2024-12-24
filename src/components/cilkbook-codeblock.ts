'use client'

import * as React from "react"
import CilkBookHighlight from "./cilkbook-highlight"

export const MyHighlight = ({
    children,
    language,
    code,
    theme,
    className,
    ...rest
}) => {
    const [html, setHtml] = React.useState(`<pre><code>${code}</code></pre>`)

    React.useEffect(() => {
        const getHighlighted = async () => {
            const highlighted = await CilkBookHighlight(code, language, theme, className, rest)
            setHtml(highlighted)
        }
        getHighlighted();
    })

    return children(html)
}
