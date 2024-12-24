import { getSingletonHighlighter, addClassToHast } from 'shiki/bundle/web'
import { SemanticHighlight } from './semantichighlight'

// Grammars for Cilk languages
import cilkcGrammar from "../langs/cilkc.tmLanguage.json"
import cilkcppGrammar from "../langs/cilkcpp.tmLanguage.json"

// Setup highlighter with default languages and themes.
import cilkbookTheme from '../codethemes/cilkbook.json'

var cachedHighlighter: any = null

/**
 * Make a shiki highlighter with Cilk/C++ and Cilk/C languages and Cilkbook theme.
 */
const makeHighlighter = async () => {
    if (!cachedHighlighter)
        cachedHighlighter = await getSingletonHighlighter({
            themes: [cilkbookTheme, 'slack-dark', 'slack-ochin', 'solarized-dark', 'solarized-light'],
            langs: ['c', 'cpp',
                { ...cilkcppGrammar },
                { ...cilkcGrammar }
            ],
        })
    return cachedHighlighter
}

/**
 * Perform syntax and semantic highlighting on the given code, using the
 * specified language (and theme), and render the result to HTML.
 */
const CilkBookHighlight = async (code: string, lang: string, theme: string = 'cilkbook', className?: string, ...rest) => {
    const highlighter = await makeHighlighter()
    return highlighter.codeToHtml(code, Object.assign({
        lang: lang,
        theme: theme,
        includeExplanation: true,
        transformers: [{
            tokens(tokens) {
                // console.log(tokens)
                const semanticTokens = SemanticHighlight(tokens, highlighter.getTheme(theme))
                // console.log(semanticTokens)
                return semanticTokens
            },
            pre(pre) { addClassToHast(pre, 'p-2.5 text-sm ' + className) }
        }]
    },
        ...rest
    ))
}

export default CilkBookHighlight
