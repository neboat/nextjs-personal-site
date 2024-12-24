'use client'

import * as React from "react"
import CilkBookHighlight from "@/components/cilkbook-highlight"

/** Paste richly formatted text.
 *
 * @param {string} rich - the text formatted as HTML
 * @param {string} plain - a plain text fallback
 */
async function pasteRich(rich, plain) {
    if (typeof ClipboardItem !== "undefined") {
        // Shiny new Clipboard API, not fully supported in Firefox.
        // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API#browser_compatibility
        const html = new Blob([rich], { type: "text/html" });
        const text = new Blob([plain], { type: "text/plain" });
        const data = new ClipboardItem({ "text/html": html, "text/plain": text });
        await navigator.clipboard.write([data]);
    } else {
        // Fallback using the deprecated `document.execCommand`.
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#browser_compatibility
        const cb = e => {
            e.clipboardData.setData("text/html", rich);
            e.clipboardData.setData("text/plain", plain);
            e.preventDefault();
        };
        document.addEventListener("copy", cb);
        document.execCommand("copy");
        document.removeEventListener("copy", cb);
    }
}

// Default code example to show when page is loaded.
const defaultInputCode =
    `// -------------------- This comment is 80 characters long. --------------------
int64_t fib(int64_t n) {
  if (n < 2) return n;
  int64_t x, y;
  cilk_scope {
    x = cilk_spawn fib(n-1);
    y = fib(n-2);
  }
  return x + y;
}`

// const Tooltip = ({ children, ...rest }) => {
//     // const [open, setOpen] = React.useState(false)
//     // const handler = React.useCallback((e) => {
//     //     console.log("keydown", e.key)
//     //     if (e.key === "Escape")
//     //         setOpen(false)
//     // })
//     // window.useEventListener("keydown", handler);
//     return (
//         <span className='tooltip rounded-lg shadow-lg p-1 bg-gray-600 text-xs text-white -mt-7' {...rest} >{children}</span>
//     )
// }

export const CodeInputOutput = () => {
    const [formData, setFormData] = React.useState({
        inputCode: defaultInputCode,
        inputCodeLang: "cilkcpp",
        inputCodeStyle: "cilkbook"
    })

    const handleInput = (e) => {
        const fieldName = e.target.name
        const fieldValue = e.target.value
        setFormData((prevState) => ({
            ...prevState,
            [fieldName]: fieldValue
        }))
    }

    React.useEffect(() => {
        const code = formData.inputCode
        const lang = formData.inputCodeLang
        const style = formData.inputCodeStyle
        const div = document.getElementById("outputCode")
        async function getHighlighted(code, lang, style) {
            div.innerHTML = await CilkBookHighlight(code, lang, style)
        }
        getHighlighted(code, lang, style)
    })

    // Action for copying formatted output to the clipboard.
    const copyFormattedToClipboard = () => {
        const str = document.getElementById('outputCode').innerHTML
        // Replace newlines with <br> in HTML
        pasteRich(str.replace(/(?:\r\n|\r|\n)/g, '<br>'), str)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
    }

    return (
        <form className="grid grid-flow-row lg:grid-cols-2 lg:gap-x-4" onSubmit={handleSubmit}>
            <div className="flex">
                <label htmlFor="inputCode" className="block py-1 text-md">Enter code to highlight:</label>
            </div>
            <textarea className={"flex lg:order-2 mb-2 lg:mb-0 font-mono p-2.5 text-sm text-gray-950 dark:text-gray-50 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 focus:border-blue-500 whitespace-pre overflow-x-auto"}
                name="inputCode" id="inputCode"
                onChange={handleInput}
                rows={formData.inputCode.split('\n').length}
                value={formData.inputCode}></textarea>
            <div className="flex items-end gap-x-4">
                <div className="block has-tooltip">
                    {/* <Tooltip>Copy formatted text to clipboard</Tooltip> */}
                    <button className="text-md bg-blue-500 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-500 text-white px-3 border border-blue-700 rounded" onClick={copyFormattedToClipboard}>
                        Copy
                    </button>
                </div>
                <div className="flex flex-wrap gap-x-2">
                    <div className="table-cell whitespace-nowrap has-tooltip">
                        <label htmlFor="inputCodeLang" className="text-md mr-1">Language:</label>
                        {/* <Tooltip>Select language</Tooltip> */}
                        <select className="text-md rounded px-1 border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 focus:border-blue-500" name="inputCodeLang" id="inputCodeLang" onChange={handleInput} value={formData.inputCodeLang}>
                            <option value="cilkcpp">Cilk/C++</option>
                            <option value="cilkc">Cilk/C</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                        </select>
                    </div>
                    <div className="table-cell whitespace-nowrap has-tooltip">
                        <label htmlFor="inputCodeStyle" className="text-md mr-1">Theme:</label>
                        {/* <Tooltip>Select style</Tooltip> */}
                        <select className="text-md rounded px-1 border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 focus:border-blue-500" name="inputCodeStyle" id="inputCodeStyle" onChange={handleInput} value={formData.inputCodeStyle}>
                            <option value="cilkbook">Cilkbook</option>
                            <option value="slack-dark">Slack dark</option>
                            <option value="slack-ochin">Slack light</option>
                            <option value="solarized-dark">Solarized dark</option>
                            <option value="solarized-light">Solarized light</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="outputCode" className="not-prose flex lg:order-2 border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 rounded overflow-x-auto">
                Loading highlighter...
            </div>
        </form>
    )
}
