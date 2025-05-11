import { BundledLanguage, BundledTheme, getSingletonHighlighter, LanguageInput, ThemedToken, ThemeInput } from 'shiki'
import { SemanticHighlight } from '../semantichighlight'
import { expect, test } from 'vitest'

// Grammars for Cilk languages
import cilkcGrammar from "../../langs/cilkc.tmLanguage.json"
import cilkcppGrammar from "../../langs/cilkcpp.tmLanguage.json"

// Create a shiki theme from the Cilkbook code theme.
import cilkbookTheme from '../../codethemes/cilkbook.json'

// Make a shiki highlighter with Cilk/C++ and Cilk/C languages and Cilkbook
// theme.
const makeHighlighter = async () => {
    const highlighter = await getSingletonHighlighter({
        themes: [cilkbookTheme as ThemeInput],
        langs: ['c', 'cpp',
            { ...cilkcppGrammar } as unknown as LanguageInput,
            { ...cilkcGrammar } as unknown as LanguageInput]
    })
    return highlighter
}

// Given code and a language, perform syntax and semantic highlighting, and
// return the resulting themed tokens.
const TestHighlight = async (code: string, lang: string, theme: string = 'cilkbook') => {
    const highlighter = await makeHighlighter()
    const tokens = highlighter.codeToTokensBase(code, {
        lang: lang as BundledLanguage,
        theme: theme as BundledTheme,
        includeExplanation: true
    })
    const _theme = highlighter.getTheme(theme)
    return SemanticHighlight(tokens, _theme)
}

// Check the given themed tokens against expectation.  The expected parameter
// contains an ordered list of tokens and associated scopes to look for in the
// given themed tokens.
const checkTokenScopes = (
    tokens: ThemedToken[][],
    expected: { content: string, scopeName: string[], notScopeName?: string[] }[]
) => {
    let eIdx = 0
    let lastMatch = ''
    // Scan each token in each line.
    for (const line of tokens) {
        for (const tok of line) {
            // If the token has an explanation, examine its explanations.
            if (tok.explanation) {
                for (const ex of tok.explanation) {
                    // If the explanation's content matches the next piece of expected content,
                    // compare the scopes.
                    const contentToMatch = ex.content.trim().length < tok.content.trim().length ? ex.content.trim() : tok.content.trim()
                    if (contentToMatch == expected[eIdx].content) {
                        // Check that the scopes on this explanation contain the expected scopes.
                        const scopesArray = expected[eIdx].scopeName.map((scopeName) =>
                            [{
                                scopeName: expect.stringMatching(scopeName),
                                themeMatches: expect.anything(),
                            }])
                        expect(ex, `Expected scope not found, expected token #${eIdx}, last match '${lastMatch}'`).toEqual({
                            content: ex.content,
                            scopes: expect.arrayContaining(scopesArray[0])
                        })
                        // Check that the scopes do not include any of the not-scopes.
                        if (expected[eIdx].notScopeName) {
                            const notScopesArray = expected[eIdx].notScopeName.map((scopeName) =>
                                [{
                                    scopeName: expect.stringMatching(scopeName),
                                    themeMatches: expect.anything(),
                                }])
                            expect(ex, `Expected excluded scope found, expected token #${eIdx}, last match '${lastMatch}'`).toEqual({
                                content: ex.content,
                                scopes: expect.not.arrayContaining(notScopesArray[0])
                            })
                        }
                        lastMatch = contentToMatch
                        // Advance to the next piece of expected content.
                        eIdx++
                        if (eIdx == expected.length)
                            // Nothing more to check.  Exit.
                            return
                    }
                }
            }
        }
    }
    // If we reach the end of the input without checking all expected entries, throw and error.
    expect(eIdx).to.equal(expected.length, `Expected '${expected[eIdx].content}' not found, last match at '${lastMatch}'`)
}

////////////////////////////////////////////////////////////////////////////////
// Unit tests.
test.each([
    {
        code: 'int x;', langs: ['cilkc', 'cilkcpp'],
        expected: [
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] }
        ]
    },
    {
        code: 'int x, y=7, z=y;', langs: ['cilkc', 'cilkcpp'],
        expected: [
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'y', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'], notScopeName: ['^variable\.other\.declare'] },
            { content: '7', scopeName: ['^constant\.numeric'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'z', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'y', scopeName: ['^source'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] }
        ]
    },
    {
        langs: ['cilkc'],
        code: `
int64_t fib(int64_t n) {
  if (n < 2) return n;
  int64_t x, y;
  cilk_scope {
    x = cilk_spawn fib(n-1);
    y = fib(n-2);
  }
  return x + y;
}`,
        expected: [
            { content: 'int64_t', scopeName: ['^storage\.type'] },
            { content: 'fib', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^meta\.function\.definition'] },
            { content: 'int64_t', scopeName: ['^storage\.type'] },
            { content: 'n', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^meta\.function\.definition'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'int64_t', scopeName: ['^storage\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'y', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'cilk_scope', scopeName: ['^keyword\.control\.cilk'] },
            { content: 'cilk_spawn', scopeName: ['^keyword\.control\.cilk'] },
            { content: 'fib', scopeName: ['^meta\.function-call', '^entity\.name\.function'] },
            { content: 'fib', scopeName: ['^meta\.function-call', '^entity\.name\.function'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code: `
int64_t fib(int64_t n) {
  if (n < 2) return n;
  int64_t x, y;
  cilk_scope {
    x = cilk_spawn fib(n-1);
    y = fib(n-2);
  }
  return x + y;
}`,
        expected: [
            { content: 'int64_t', scopeName: ['^storage\.type'] },
            { content: 'fib', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^meta\.function\.definition'] },
            { content: 'int64_t', scopeName: ['^storage\.type'] },
            { content: 'n', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^meta\.function\.definition'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'int64_t', scopeName: ['^storage\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'y', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: 'cilk_scope', scopeName: ['^keyword\.control\.cilk'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'cilk_spawn', scopeName: ['^keyword\.control\.cilk'] },
            { content: 'fib', scopeName: ['^entity\.name\.function\.call'] },
            { content: 'fib', scopeName: ['^entity\.name\.function\.call'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
template <typename A> static void reduce(void *left, void *right) {
  if (std::is_destructible<A>::value)
    static_cast<A *>(right)->~A();
}`,
        expected: [
            { content: 'is_destructible', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '<', scopeName: ['^meta\.template\.call'] },
            { content: 'A', scopeName: ['^^entity\.name\.type\.defined\.sema'] },
            { content: '>', scopeName: ['^meta\.template\.call'] },
            { content: '::', scopeName: ['^punctuation\.separator\.namespace\.access'] },
            { content: 'value', scopeName: ['^meta\.body\.function'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'static_cast', scopeName: ['^keyword\.operator\.cast\.static_cast'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template'] },
            { content: 'A', scopeName: ['^entity\.name\.type\.defined'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template'] },
            { content: 'right', scopeName: ['^meta\.body\.function'], notScopeName: ['^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkc', 'cilkcpp'],
        code:
            `
union {
    struct foo {
        uint8_t x:1;
        uint8_t y:2;
        uint8_t r:5;
    };
    uint8_t flags;
};`,
        expected: [
            { content: 'union', scopeName: ['^storage\.type\.union'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'foo', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'uint8_t', scopeName: ['^storage\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.declare'] },
            { content: ':', scopeName: ['^meta\.block'] }, // TODO: Fix scopes across C and C++
            { content: '1', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'uint8_t', scopeName: ['^storage\.type'] },
            { content: 'y', scopeName: ['^variable\.other\.declare'] },
            { content: ':', scopeName: ['^meta\.block'] }, // TODO: Fix scopes across C and C++
            { content: '2', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'uint8_t', scopeName: ['^storage\.type'] },
            { content: 'r', scopeName: ['^variable\.other\.declare'] },
            { content: ':', scopeName: ['^meta\.block'] }, // TODO: Fix scopes across C and C++
            { content: '5', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
            { content: 'uint8_t', scopeName: ['^storage\.type'] },
            { content: 'flags', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkc', 'cilkcpp'],
        code:
            `
struct S {
    struct T {
        int y;
    } z;
    int x;
} s;`,
        expected: [
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'S', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'T', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'y', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'z', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: 's', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkc', 'cilkcpp'],
        code:
            `
union S
{
  uint32_t u32;
  uint16_t u16[2];
  uint8_t  u8;
} s = {0x12345678};`,
        expected: [
            { content: 'union', scopeName: ['^storage\.type\.union'] },
            { content: 'S', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'uint32_t', scopeName: ['^storage\.type'] },
            { content: 'u32', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'uint16_t', scopeName: ['^storage\.type'] },
            { content: 'u16', scopeName: ['^variable\.other\.declare'] },
            { content: '[', scopeName: ['^punctuation\.definition\.begin\.bracket\.square', '^meta\.bracket\.square\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: '2', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ']', scopeName: ['^punctuation\.definition\.end\.bracket\.square', '^meta\.bracket\.square\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'uint8_t', scopeName: ['^storage\.type'] },
            { content: 'u8', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: 's', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'], notScopeName: ['^variable\.other\.declare'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: '0x', scopeName: ['^keyword\.other\.unit\.hexadecimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: '12345678', scopeName: ['^constant\.numeric\.hexadecimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkc'],
        code:
            `
union pad
{
  char c[5]; // occupies 5 bytes
  float f;   // occupies 4 bytes, imposes alignment 4
} p = { .f = 1.23 };`,
        expected: [
            { content: 'union', scopeName: ['^storage\.type\.union'] },
            { content: 'pad', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'char', scopeName: ['^storage\.type'] },
            { content: 'c', scopeName: ['^variable\.other\.declare'] },
            { content: '[', scopeName: ['^punctuation\.definition\.begin\.bracket\.square', '^meta\.bracket\.square\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: '5', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ']', scopeName: ['^punctuation\.definition\.end\.bracket\.square', '^meta\.bracket\.square\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'occupies 5 bytes', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'float', scopeName: ['^storage\.type'] },
            { content: 'f', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'occupies 4 bytes, imposes alignment 4', scopeName: ['^comment\.line\.double-slash'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'p', scopeName: ['^variable\.other\.declare', '^meta\.tail\.union'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment', '^meta\.tail\.union'], notScopeName: ['^variable\.other\.declare'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: '.f', scopeName: ['^meta\.block', '^meta\.tail\.union'], notScopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'], notScopeName: ['^variable\.other\.declare'] },
            { content: '1', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: '.', scopeName: ['^constant\.numeric\.decimal\.point'], notScopeName: ['^variable\.other\.declare'] },
            { content: '23', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
union pad
{
  char c[5]; // occupies 5 bytes
  float f;   // occupies 4 bytes, imposes alignment 4
} p = { .f = 1.23 };`,
        expected: [
            { content: 'union', scopeName: ['^storage\.type\.union'] },
            { content: 'pad', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'char', scopeName: ['^storage\.type'] },
            { content: 'c', scopeName: ['^variable\.other\.declare'] },
            { content: '[', scopeName: ['^punctuation\.definition\.begin\.bracket\.square', '^meta\.bracket\.square\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: '5', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ']', scopeName: ['^punctuation\.definition\.end\.bracket\.square', '^meta\.bracket\.square\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'occupies 5 bytes', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'float', scopeName: ['^storage\.type'] },
            { content: 'f', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'occupies 4 bytes, imposes alignment 4', scopeName: ['^comment\.line\.double-slash'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'p', scopeName: ['^variable\.other\.declare', '^meta\.tail\.union'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment', '^meta\.tail\.union'], notScopeName: ['^variable\.other\.declare'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: '.', scopeName: ['^meta\.block', '^meta\.tail\.union'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'f', scopeName: ['^meta\.block', '^meta\.tail\.union', '^variable\.other\.unknown'], notScopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'], notScopeName: ['^variable\.other\.declare'] },
            { content: '1', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: '.', scopeName: ['^constant\.numeric\.decimal\.point'], notScopeName: ['^variable\.other\.declare'] },
            { content: '23', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
    class S;
    typedef struct T {
        S s;
    } T;
    struct U {
        T t;
    } u;`,
        expected: [
            { content: 'class', scopeName: ['^storage\.type\.class'] },
            { content: 'S', scopeName: ['^entity\.name\.type'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^entity\.name\.type'] },
            { content: 'typedef', scopeName: ['^keyword\.other\.typedef'] },
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'T', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'S', scopeName: ['^entity\.name\.type\.defined'] },
            { content: 's', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'T', scopeName: ['^entity\.name\.type', 'meta\.tail\.struct'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'U', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'T', scopeName: ['^entity\.name\.type\.defined'] },
            { content: 't', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'u', scopeName: ['^variable\.other\.declare', 'meta\.tail\.struct'], notScopeName: ['^entity\.name\.type'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkc', 'cilkcpp'],
        code:
            `
    typedef struct S S;
    typedef struct T {
        S s;
    } T;
    struct U {
        T t;
    } u;`,
        expected: [
            { content: 'typedef', scopeName: ['^keyword\.other\.typedef'] },
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'S', scopeName: ['^entity\.name\.type'] },
            { content: 'S', scopeName: ['^entity\.name\.type'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^entity\.name\.type'] },
            { content: 'typedef', scopeName: ['^keyword\.other\.typedef'] },
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'T', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'S', scopeName: ['^entity\.name\.type'] },
            { content: 's', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'T', scopeName: ['^entity\.name\.type\.defined', 'meta\.tail\.struct'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'U', scopeName: ['^entity\.name\.type'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^entity\.name\.type'] },
            { content: 'T', scopeName: ['^entity\.name\.type'] },
            { content: 't', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'u', scopeName: ['^variable\.other\.declare', 'meta\.tail\.struct'], notScopeName: ['^entity\.name\.type'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
        ]
    },
    {
        langs: ['cilkc', 'cilkcpp'],
        code: `int min = a < b ? a : b;`,
        expected: [
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'min', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'a', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: '<', scopeName: ['^keyword\.operator\.comparison'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare', 'template'] },
            { content: 'b', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: '?', scopeName: ['^keyword\.operator\.ternary'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'a', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: ':', scopeName: ['^keyword\.operator\.ternary'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'b', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] }
        ]
    },
    {
        langs: ['cilkcpp'],
        code: `int min = a < b ? a : b; int res = foo<A>(r);`,
        expected: [
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'min', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'a', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: '<', scopeName: ['^keyword\.operator\.comparison'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare', 'template'] },
            { content: 'b', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: '?', scopeName: ['^keyword\.operator\.ternary'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'a', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: ':', scopeName: ['^keyword\.operator\.ternary'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: 'b', scopeName: ['^source'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'res', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'foo', scopeName: ['^entity\.name\.function\.call'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template'] },
            { content: 'A', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.call'] },
            { content: 'r', scopeName: ['^source'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.call'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code: `[pivot=*mid](T a) { return a < pivot; }`,
        expected: [
            { content: '[', scopeName: ['^punctuation\.definition\.capture\.begin\.lambda'] },
            { content: 'pivot', scopeName: ['^variable\.parameter\.capture'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: '*', scopeName: ['^keyword\.operator'] },  // TODO: Mark this as a pointer storage-class specifier?
            { content: 'mid', scopeName: ['^variable\.parameter\.initializer'] },
            { content: ']', scopeName: ['^punctuation\.definition\.capture\.end\.lambda'] },
            { content: '(', scopeName: ['^punctuation\.definition\.parameters\.begin\.lambda'] },
            { content: 'T', scopeName: ['^entity\.name\.type'] },
            { content: 'a', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^punctuation\.definition\.parameters\.end\.lambda'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly\.lambda'] },
            { content: 'return', scopeName: ['^keyword\.control\.return'] },
            { content: 'a', scopeName: ['^meta\.function\.definition\.body\.lambda'], notScopeName: ['^variable\.parameter', '^variable\.other\.declare'] },
            { content: '<', scopeName: ['^keyword\.operator\.comparison'] },
            { content: 'pivot', scopeName: ['^meta\.function\.definition\.body\.lambda'], notScopeName: ['^variable\.parameter', '^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.lambda'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
template <typename T> void sample_qsort(T* begin, T* end) {
  if (end - begin < BASE_CASE_LENGTH) {
    std::sort(begin, end);  // Base case: Serial sort
  } else {
    --end;  // Exclude last element (pivot) from partition
    T* middle = std::partition(begin, end, [pivot=*end](T a) { return a < pivot; });
    std::swap(*end, *middle);  // Move pivot to middle
    cilk_scope {
      cilk_spawn sample_qsort(begin, middle);
      sample_qsort(++middle, ++end);  // Exclude pivot and restore end
    }
  }
}`,
        expected: [
            { content: 'template', scopeName: ['^storage\.type\.template'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.definition'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'T', scopeName: ['^entity\.name\.type\.template'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.definition'] },
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'sample_qsort', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: 'T', scopeName: ['^entity\.name\.type\.parameter'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'begin', scopeName: ['^variable\.parameter'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'T', scopeName: ['^entity\.name\.type\.parameter'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'end', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly\.function\.definition'] },

            { content: 'if', scopeName: ['^keyword\.control\.if'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'end', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: '-', scopeName: ['^keyword\.operator\.arithmetic'] },
            { content: 'begin', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: '<', scopeName: ['^keyword\.operator\.comparison'] },
            { content: 'BASE_CASE_LENGTH', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },

            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'sort', scopeName: ['^entity\.name\.function\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.call'] },
            { content: 'begin', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'end', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.call'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'Base case: Serial sort', scopeName: ['^comment\.line\.double-slash'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },

            { content: 'else', scopeName: ['^keyword\.control\.else'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: '--', scopeName: ['^keyword\.operator\.decrement'] },
            { content: 'end', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'Exclude last element (pivot) from partition', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'T', scopeName: ['^entity\.name\.type\.defined'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'middle', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'partition', scopeName: ['^entity\.name\.function\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.call'] },
            { content: 'begin', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'end', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },

            { content: '[', scopeName: ['^punctuation\.definition\.capture\.begin\.lambda'] },
            { content: 'pivot', scopeName: ['^variable\.parameter\.capture'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: '*', scopeName: ['^keyword\.operator'] },  // TODO: Mark this as a pointer storage-class specifier?
            { content: 'end', scopeName: ['^variable\.parameter\.initializer'] },
            { content: ']', scopeName: ['^punctuation\.definition\.capture\.end\.lambda'] },
            { content: '(', scopeName: ['^punctuation\.definition\.parameters\.begin\.lambda'] },
            { content: 'T', scopeName: ['^entity\.name\.type'] },
            { content: 'a', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^punctuation\.definition\.parameters\.end\.lambda'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly\.lambda'] },
            { content: 'return', scopeName: ['^keyword\.control\.return'] },
            { content: 'a', scopeName: ['^meta\.function\.definition\.body\.lambda'], notScopeName: ['^variable\.parameter', '^variable\.other\.declare'] },
            { content: '<', scopeName: ['^keyword\.operator\.comparison'] },
            { content: 'pivot', scopeName: ['^meta\.function\.definition\.body\.lambda'], notScopeName: ['^variable\.parameter', '^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.lambda'] },

            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.call'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'swap', scopeName: ['^entity\.name\.function\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.call'] },
            { content: '*', scopeName: ['^keyword\.operator'] },  // TODO: Mark this as a pointer storage-class specifier?
            { content: 'end', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: '*', scopeName: ['^keyword\.operator'] },  // TODO: Mark this as a pointer storage-class specifier?
            { content: 'middle', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.call'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'Move pivot to middle', scopeName: ['^comment\.line\.double-slash'] },

            { content: 'cilk_scope', scopeName: ['^keyword\.control\.cilk_scope'], notScopeName: ['^variable\.other\.declare'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'cilk_spawn', scopeName: ['^keyword\.control\.cilk_spawn'] },
            { content: 'sample_qsort', scopeName: ['^entity\.name\.function\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.call'] },
            { content: 'begin', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'middle', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.call'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: 'sample_qsort', scopeName: ['^entity\.name\.function\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.call'] },
            { content: '++', scopeName: ['^keyword\.operator\.increment'] },
            { content: 'middle', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: '++', scopeName: ['^keyword\.operator\.increment'] },
            { content: 'end', scopeName: ['^meta\.block'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.call'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'Exclude pivot and restore end', scopeName: ['^comment\.line\.double-slash'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.function\.definition'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
template<typename Char, typename Traits = std::char_traits<Char>>
using ostream_reducer = ostream_view<Char, Traits>
cilk_reducer(&ostream_view<char, std::char_traits<char>>::identity,
    &ostream_view<char, std::char_traits<char>>::reduce);`,
        expected: [
            { content: 'template', scopeName: ['^storage\.type\.template'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.definition'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Char', scopeName: ['^entity\.name\.type\.template'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type\.template'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'char_traits', scopeName: ['^meta\.template\.definition'] }, // TODO: Recognize this as a type?
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.definition'] },
            { content: 'using', scopeName: ['^keyword\.other\.using\.directive'] },
            { content: 'ostream_reducer', scopeName: ['^entity\.name\.type'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'ostream_view', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: 'cilk_reducer', scopeName: ['^storage\.modifier\.specifier\.cilk_reducer'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: '&', scopeName: ['^keyword\.operator\.bitwise'] }, // TODO: Recognize this as a reference
            { content: 'ostream_view', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'char', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'char_traits', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'char', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'identity', scopeName: ['^meta\.parens'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },

            { content: 'ostream_view', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'char', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'char_traits', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'char', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'reduce', scopeName: ['^meta\.parens'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
template<typename Char, typename Traits>
class ostream_view : public std::basic_ostream<Char, Traits>
{
public:
    static void reduce(void *left_v, void *right_v) {
        ostream_view<Char, Traits> *left =
          static_cast<ostream_view<Char, Traits> *>(left_v);
        ostream_view<Char, Traits> *right =
          static_cast<ostream_view<Char, Traits> *>(right_v);
        left->reduce(right);
        right->~ostream_view();
    }
};`,
        expected: [
            { content: 'template', scopeName: ['^storage\.type\.template'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.definition'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Char', scopeName: ['^entity\.name\.type\.template'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type\.template'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.definition'] },
            { content: 'class', scopeName: ['^storage\.type\.class'] },
            { content: 'ostream_view', scopeName: ['^entity\.name\.type'] },
            { content: ':', scopeName: ['^punctuation\.separator\.colon\.inheritance'] },
            { content: 'public', scopeName: ['^storage\.type\.modifier\.access\.public'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'basic_ostream', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'public', scopeName: ['^storage\.type\.modifier\.access\.control\.public'] },
            { content: ':', scopeName: ['^punctuation\.separator\.colon\.access\.control'] },
            { content: 'static', scopeName: ['^storage\.modifier\.static'] },
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'reduce', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'left_v', scopeName: ['^variable\.parameter'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'right_v', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly\.function\.definition'] },

            { content: 'ostream_view', scopeName: ['^entity\.name\.type\.defined'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'left', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'static_cast', scopeName: ['^keyword\.operator\.cast\.static_cast'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'ostream_view', scopeName: ['^entity\.name\.type\.defined'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'left_v', scopeName: ['^meta\.parens', '^meta\.body\.function\.definition'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: 'ostream_view', scopeName: ['^entity\.name\.type\.defined'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'right', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: 'static_cast', scopeName: ['^keyword\.operator\.cast\.static_cast'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'ostream_view', scopeName: ['^entity\.name\.type\.defined'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'right_v', scopeName: ['^meta\.parens', '^meta\.body\.function\.definition'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: 'left', scopeName: ['^variable\.other\.object\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: '->', scopeName: ['^punctuation\.separator\.pointer-access'] },
            { content: 'reduce', scopeName: ['^entity\.name\.function\.member'], notScopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round'] },
            { content: 'right', scopeName: ['^meta\.body\.function\.definition'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: 'right', scopeName: ['^variable\.other\.object\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: '->', scopeName: ['^punctuation\.separator\.pointer-access'] },
            { content: '~ostream_view', scopeName: ['^entity\.name\.function\.member'], notScopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.class'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
template<typename Char, typename Traits>
class ostream_view : public std::basic_ostream<Char, Traits>
{
    std::basic_stringbuf<Char, Traits> m_buffer;
};`,
        expected: [
            { content: 'template', scopeName: ['^storage\.type\.template'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.definition'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Char', scopeName: ['^entity\.name\.type\.template'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type\.template'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.definition'] },
            { content: 'class', scopeName: ['^storage\.type\.class'] },
            { content: 'ostream_view', scopeName: ['^entity\.name\.type'] },
            { content: ':', scopeName: ['^punctuation\.separator\.colon\.inheritance'] },
            { content: 'public', scopeName: ['^storage\.type\.modifier\.access\.public'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'basic_ostream', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },

            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'basic_stringbuf', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: 'm_buffer', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.class'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
template<typename Char, typename Traits>
class ostream_view : public std::basic_ostream<Char, Traits>
{
public:
    void reduce(ostream_view* other)
    {
        if (other->m_buffer.sgetc() != Traits::eof()) {
            *this << (&other->m_buffer);
        }
    }
};`,
        expected: [
            { content: 'template', scopeName: ['^storage\.type\.template'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.definition'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Char', scopeName: ['^entity\.name\.type\.template'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'typename', scopeName: ['^storage\.type\.template\.argument\.typename'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type\.template'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.definition'] },
            { content: 'class', scopeName: ['^storage\.type\.class'] },
            { content: 'ostream_view', scopeName: ['^entity\.name\.type'] },
            { content: ':', scopeName: ['^punctuation\.separator\.colon\.inheritance'] },
            { content: 'public', scopeName: ['^storage\.type\.modifier\.access\.public'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'basic_ostream', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'Char', scopeName: ['^entity\.name\.type'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'] },
            { content: 'Traits', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: 'public', scopeName: ['^storage\.type\.modifier\.access\.control\.public'] },
            { content: ':', scopeName: ['^punctuation\.separator\.colon\.access\.control'] },

            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'reduce', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: 'ostream_view', scopeName: ['^entity\.name\.type\.parameter'] },
            { content: '*', scopeName: ['^storage\.modifier\.pointer'] },
            { content: 'other', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly\.function\.definition'] },

            { content: 'if', scopeName: ['^keyword\.control\.if'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'other', scopeName: ['^variable\.other\.object\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: '->', scopeName: ['^punctuation\.separator\.pointer-access'] },
            { content: 'm_buffer', scopeName: ['^variable\.other\.object\.property'], notScopeName: ['^variable\.other\.declare'] },
            { content: '.', scopeName: ['^punctuation\.separator\.dot-access'] },
            { content: 'sgetc', scopeName: ['^entity\.name\.function\.member'], notScopeName: ['^variable\.other\.declare', 'definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.member'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.member'] },
            { content: '!=', scopeName: ['^keyword\.operator\.comparison'] },
            { content: 'Traits', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'eof', scopeName: ['^entity\.name\.function\.call'] },
            { content: '(', scopeName: ['^punctuation\.section\.arguments\.begin\.bracket\.round\.function\.call'] },
            { content: ')', scopeName: ['^punctuation\.section\.arguments\.end\.bracket\.round\.function\.call'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },

            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },
            { content: '*', scopeName: ['^keyword\.operator\.arithmetic'] }, // TODO: Recognize this as a pointer dereference?
            { content: 'this', scopeName: ['^variable\.language\.this'] },
            { content: '<<', scopeName: ['^keyword\.operator\.bitwise\.shift'] }, // TODO: Recognize this as the output-stream operator?
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: '&', scopeName: ['^keyword\.operator\.bitwise'] }, // TODO: Recognize this as address-of operator?
            { content: 'other', scopeName: ['^variable\.other\.object\.access'], notScopeName: ['^variable\.other\.declare'] },
            { content: '->', scopeName: ['^punctuation\.separator\.pointer-access'] },
            { content: 'm_buffer', scopeName: ['^variable\.other\.property'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.function\.definition'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.class'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code:
            `
struct X
{
    int x, y;
    int operator()(int);
    void f()
    {
        // the context of the following lambda is the member function X::f
        [=]() -> int
        {
            return operator()(this->x + y); // X::operator()(this->x + (*this).y)
                                            // this has type X*
        };
    }
};
`,
        expected: [
            { content: 'struct', scopeName: ['^storage\.type\.struct'] },
            { content: 'X', scopeName: ['^entity\.name\.type'] },

            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },

            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'y', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },

            { content: 'int', scopeName: ['^storage\.type'] },
            { content: 'operator', scopeName: ['^keyword\.other\.operator\.overload'] },
            { content: '()', scopeName: ['^entity\.name\.operator'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: 'int', scopeName: ['^storage\.type'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: 'void', scopeName: ['^storage\.type'] },
            { content: 'f', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },

            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly\.function\.definition'] },

            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'the context of the following lambda is the member function X::f', scopeName: ['^comment\.line\.double-slash'] },

            { content: '[', scopeName: ['^punctuation\.definition\.capture\.begin\.lambda'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: ']', scopeName: ['^punctuation\.definition\.capture\.end\.lambda'] },
            { content: '(', scopeName: ['^punctuation\.definition\.parameters\.begin\.lambda'] },
            { content: ')', scopeName: ['^punctuation\.definition\.parameters\.end\.lambda'] },
            { content: '->', scopeName: ['^punctuation\.definition\.lambda\.return-type'] },
            { content: 'int', scopeName: ['^storage\.type'] },

            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly\.lambda'] },

            { content: 'return', scopeName: ['^keyword\.control\.return'] },
            { content: 'operator', scopeName: ['^variable\.other\.unknown\.operator'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'this', scopeName: ['^variable\.language\.this'], notScopeName: ['^entity\.name\.type'] },
            { content: '->', scopeName: ['^punctuation\.separator\.pointer-access'], notScopeName: ['^entity\.name\.type'] },
            { content: 'x', scopeName: ['^variable\.other\.property'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: '+', scopeName: ['^keyword\.operator\.arithmetic'] },
            { content: 'y', scopeName: ['^variable\.other\.unknown'], notScopeName: ['^entity\.name\.type', '^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.lambda'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly\.function\.definition'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
        ]
    },
    {
        langs: ['cilkc', 'cilkcpp'],
        code:
            `
void vecsum(double *Y, const double *X, int n) {
  for (int i = 0; i < n; ++i)
    Y[i] += X[i];
}`,
        expected: [
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'vecsum', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: 'double', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'Y', scopeName: ['^variable\.parameter'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'] },
            { content: 'const', scopeName: ['^storage\.modifier'] },
            { content: 'double', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'X', scopeName: ['^variable\.parameter'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'] },
            { content: 'int', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'n', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },

            { content: 'for', scopeName: ['^keyword\.control'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'int', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'i', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: '0', scopeName: ['^constant\.numeric\.decimal'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: 'i', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: '<', scopeName: ['^keyword\.operator\.comparison'] },
            { content: 'n', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '++', scopeName: ['^keyword\.operator\.increment'] },
            { content: 'i', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },

            { content: 'Y', scopeName: ['^variable'], notScopeName: ['^variable\.other\.declare'] },
            { content: '[', scopeName: ['^punctuation\.definition\.begin\.bracket\.square'] },
            { content: 'i', scopeName: ['^meta\.bracket'], notScopeName: ['^variable\.other\.declare'] },
            { content: ']', scopeName: ['^punctuation\.definition\.end\.bracket\.square'] },
            { content: '+=', scopeName: ['^keyword\.operator\.assignment\.compound'] },
            { content: 'X', scopeName: ['^variable'], notScopeName: ['^variable\.other\.declare'] },
            { content: '[', scopeName: ['^punctuation\.definition\.begin\.bracket\.square'] },
            { content: 'i', scopeName: ['^meta\.bracket'], notScopeName: ['^variable\.other\.declare'] },
            { content: ']', scopeName: ['^punctuation\.definition\.end\.bracket\.square'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
        ]
    },
    {
        langs: ['cilkc', 'cilkcpp'],
        code:
            `
void vecsum(double *Y, const double *X, int n) {
  int i;
  for (i = 0; i < n; ++i)
    Y[i] += X[i];
}`,
        expected: [
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'vecsum', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: 'double', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'Y', scopeName: ['^variable\.parameter'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'] },
            { content: 'const', scopeName: ['^storage\.modifier'] },
            { content: 'double', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'X', scopeName: ['^variable\.parameter'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'] },
            { content: 'int', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'n', scopeName: ['^variable\.parameter'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },

            { content: 'int', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'i', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: 'for', scopeName: ['^keyword\.control'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'i', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment'] },
            { content: '0', scopeName: ['^constant\.numeric\.decimal'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: 'i', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: '<', scopeName: ['^keyword\.operator\.comparison'] },
            { content: 'n', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },
            { content: '++', scopeName: ['^keyword\.operator\.increment'] },
            { content: 'i', scopeName: ['^meta\.parens'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },

            { content: 'Y', scopeName: ['^variable'], notScopeName: ['^variable\.other\.declare'] },
            { content: '[', scopeName: ['^punctuation\.definition\.begin\.bracket\.square'] },
            { content: 'i', scopeName: ['^meta\.bracket'], notScopeName: ['^variable\.other\.declare'] },
            { content: ']', scopeName: ['^punctuation\.definition\.end\.bracket\.square'] },
            { content: '+=', scopeName: ['^keyword\.operator\.assignment\.compound'] },
            { content: 'X', scopeName: ['^variable'], notScopeName: ['^variable\.other\.declare'] },
            { content: '[', scopeName: ['^punctuation\.definition\.begin\.bracket\.square'] },
            { content: 'i', scopeName: ['^meta\.bracket'], notScopeName: ['^variable\.other\.declare'] },
            { content: ']', scopeName: ['^punctuation\.definition\.end\.bracket\.square'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code: `
void hyrax_round() {
    std::vector<std::vector<Scalar>> As, Bs, Cs;
}`,
        expected: [
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'hyrax_round', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },

            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'vector', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'vector', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'Scalar', scopeName: ['^entity\.name\.type'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: 'As', scopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'Bs', scopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter'], notScopeName: ['^variable\.other\.declare'] },
            { content: 'Cs', scopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
        ]
    },
    {
        langs: ['cilkcpp'],
        code: `
void foo() {
  std::set<int> mySet = {1, 2, 3, 4, 5};

  // for-range loop
  for (const auto& element : mySet) {
    std::cout << element << ", ";
  }
}`,
        expected: [
            { content: 'void', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: 'foo', scopeName: ['^entity\.name\.function\.definition'] },
            { content: '(', scopeName: ['^punctuation\.section\.parameters\.begin\.bracket\.round'] },
            { content: ')', scopeName: ['^punctuation\.section\.parameters\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },

            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'set', scopeName: ['^entity\.name\.type'] },
            { content: '<', scopeName: ['^punctuation\.section\.angle-brackets\.begin\.template\.call'] },
            { content: 'int', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: '>', scopeName: ['^punctuation\.section\.angle-brackets\.end\.template\.call'] },
            { content: 'mySet', scopeName: ['^variable\.other\.declare'] },
            { content: '=', scopeName: ['^keyword\.operator\.assignment', '^meta\.tail\.union'], notScopeName: ['^variable\.other\.declare'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: '1', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'], notScopeName: ['^variable\.other\.declare'] },
            { content: '2', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'], notScopeName: ['^variable\.other\.declare'] },
            { content: '3', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'], notScopeName: ['^variable\.other\.declare'] },
            { content: '4', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: ',', scopeName: ['^punctuation\.separator\.delimiter\.comma'], notScopeName: ['^variable\.other\.declare'] },
            { content: '5', scopeName: ['^constant\.numeric\.decimal'], notScopeName: ['^variable\.other\.declare'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'], notScopeName: ['^variable\.other\.declare'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },

            { content: '//', scopeName: ['^comment\.line\.double-slash'] },
            { content: 'for-range loop', scopeName: ['^comment\.line\.double-slash'] },

            { content: 'for', scopeName: ['^keyword\.control'] },
            { content: '(', scopeName: ['^punctuation\.section\.parens\.begin\.bracket\.round'] },
            { content: 'const', scopeName: ['^storage\.modifier'] },
            { content: 'auto', scopeName: ['^storage\.type\.built-in\.primitive'] },
            { content: '&', scopeName: ['^storage\.modifier\.reference'] },
            { content: 'element', scopeName: ['^variable\.other\.declare'] },
            { content: ':', scopeName: ['^punctuation\.separator\.colon\.range-based'] },
            { content: 'mySet', scopeName: ['^variable\.other\.unknown'], notScopeName: ['^variable\.other\.declare'] },
            { content: ')', scopeName: ['^punctuation\.section\.parens\.end\.bracket\.round'] },
            { content: '{', scopeName: ['^punctuation\.section\.block\.begin\.bracket\.curly'] },

            { content: 'std', scopeName: ['^entity\.name\.scope-resolution'] },
            { content: '::', scopeName: ['^punctuation\.separator\.scope-resolution'] },
            { content: 'cout', scopeName: ['^variable\.other\.unknown'], notScopeName: ['^entity\.name\.type'] },
            { content: '<<', scopeName: ['^keyword\.operator'] },
            { content: 'element', scopeName: ['^variable\.other\.unknown'], notScopeName: ['^variable\.other\.declare'] },
            { content: '<<', scopeName: ['^keyword\.operator'] },
            { content: '"', scopeName: ['^punctuation\.definition\.string\.begin'] },
            { content: ',', scopeName: ['^string\.quoted\.double'] },
            { content: '"', scopeName: ['^punctuation\.definition\.string\.end'] },
            { content: ';', scopeName: ['^punctuation\.terminator\.statement'], notScopeName: ['^variable\.other\.declare'] },

            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
            { content: '}', scopeName: ['^punctuation\.section\.block\.end\.bracket\.curly'] },
        ]
    }
])('SemanticHighlight($langs, $code)', async ({ code, langs, expected }) => {
    for (const lang of langs) {
        const semanticTokens = await TestHighlight(code, lang)
        checkTokenScopes(semanticTokens, expected)
    }
})

// Test cases to investigate further:

// `
// // generic lambda, operator() is a template with two parameters
// auto glambda = []<class T>(T a, auto&& b) { return a < b; };

// // generic lambda, operator() is a template with one parameter pack
// auto f = []<typename... Ts>(Ts&&... ts)
// {
//     return foo(std::forward<Ts>(ts)...);
// };
// `