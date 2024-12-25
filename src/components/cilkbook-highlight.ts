import { getSingletonHighlighter, addClassToHast, BundledLanguage, BundledTheme, HighlighterGeneric, ThemeInput, LanguageInput } from 'shiki/bundle/web'
import { SemanticHighlight } from './semantichighlight'

// Grammars for Cilk languages
import cilkcGrammar from "../langs/cilkc.tmLanguage.json"
import cilkcppGrammar from "../langs/cilkcpp.tmLanguage.json"

// Setup highlighter with default languages and themes.
import cilkbookTheme from '../codethemes/cilkbook.json'

let cachedHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null

/**
 * Make a shiki highlighter with Cilk/C++ and Cilk/C languages and Cilkbook theme.
 */
const makeHighlighter = async () => {
    if (!cachedHighlighter)
        cachedHighlighter = await getSingletonHighlighter({
            themes: [cilkbookTheme as ThemeInput, 'slack-dark', 'slack-ochin', 'solarized-dark', 'solarized-light'],
            langs: ['c', 'cpp',
                { ...cilkcppGrammar } as unknown as LanguageInput,
                { ...cilkcGrammar } as unknown as LanguageInput
            ],
        })
    return cachedHighlighter
}

/**
 * Perform syntax and semantic highlighting on the given code, using the
 * specified language (and theme), and render the result to HTML.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const CilkBookHighlight = async (code: string, lang: string, theme: string = 'cilkbook', className?: string, ...rest: any[]) => {
    const highlighter = await makeHighlighter()
    return highlighter.codeToHtml(code, Object.assign({
        lang: lang,
        theme: theme,
        includeExplanation: 'scopeName',
        transformers: [{
            tokens(tokens: any) {
                // console.log(tokens)
                const semanticTokens = SemanticHighlight(tokens, highlighter.getTheme(theme))
                // console.log(semanticTokens)
                return semanticTokens
            },
            pre(pre: any) { addClassToHast(pre, 'p-2.5 text-sm ' + className) }
        }]
    },
        ...rest
    ))
}
/* eslint-enable */

export default CilkBookHighlight
