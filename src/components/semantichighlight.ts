import { ThemedToken, ThemeRegistrationResolved } from 'shiki/bundle/web'
import { FontStyle, IRawThemeSetting } from '@shikijs/vscode-textmate'

const DEBUG = false

function debug_print(str: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (DEBUG)
        console.log(str)
}

/**
 * Copied from @shikijs/vscode-textmate.
 */
const enum MyFontStyle {
    NotSet = -1,
    None = 0,
    Italic = 1,
    Bold = 2,
    Underline = 4,
    Strikethrough = 8
}

/**
 * Subcomponent of a ThemedToken with its own explanation.
 */
type ExplainedSubtoken = {
    token: ThemedToken,
    content: string,
    scopes: string[],
    index: number
}

/**
 * Extract the explained subtokens from the given token.
 * @param parsedToken A given ThemedToken.
 * @returns An array of explained subtokens, or `undefined` if no explanation is available.
 */
function getExplainedSubtokens(parsedToken: ThemedToken) {
    const explanation = parsedToken["explanation"]
    if (explanation) {
        const tokenScopes: ExplainedSubtoken[] = []
        let index = 0
        for (const explained of explanation) {
            const content = explained.content
            const scopes = explained.scopes.map(scope => scope.scopeName)
            tokenScopes.push({ token: parsedToken, content, scopes, index })
            index++
        }
        return tokenScopes
    }
    return undefined
}

/**
 * Recognized semantic scopes
 */
type SemanticScope =
    | 'source'
    | 'vardef'
    | 'vardefaftername'
    | 'assignment'
    | 'function.head'
    | 'function.body'
    | 'loop'
    | 'parens'
    | 'block'
    | 'namespace'
    | 'template'
    | 'typename'
    | 'typedef'
    | 'template.spec'
    | 'cast'
    | 'structure'
    | 'struct.name'
    | 'arrayidx'
    | 'type'

////////////////////////////////////////////////////////
// Utility methods generating themed tokens

/**
 *  Check if the given selector matches the scope.
 */
// Copied from shiki source.
function matchesOne(selector: string, scope: string): boolean {
    const selectorPrefix = selector + '.'
    if (selector === scope || scope.substring(0, selectorPrefix.length) === selectorPrefix) {
        return true
    }
    return false
}

/**
 * Check if any of the selectors match any of the scopes.
 * @param selectors Array of selectors to check for.
 * @param scopes Array of scopes to check.
 * @returns `true` if any of `selectors` match any of the `scopes`, `false` otherwise.
 */
function matchesAny(
    selectors: string[],
    scopes: string[]
): boolean {
    for (const selector of selectors) {
        let scopeIndex = scopes.length - 1
        while (scopeIndex >= 0) {
            if (matchesOne(selector, scopes[scopeIndex])) {
                return true
            }
            scopeIndex--
        }
    }
    return false
}

// Copied from shiki source.
function matches(
    selector: string,
    selectorParentScopes: string[],
    scope: string,
    parentScopes: string[]
): boolean {
    if (!matchesOne(selector, scope))
        return false

    let selectorParentIndex = selectorParentScopes.length - 1
    let parentIndex = parentScopes.length - 1
    while (selectorParentIndex >= 0 && parentIndex >= 0) {
        if (matchesOne(selectorParentScopes[selectorParentIndex], parentScopes[parentIndex]))
            selectorParentIndex -= 1
        parentIndex -= 1
    }

    if (selectorParentIndex === -1)
        return true

    return false
}

// Copied from shiki source.
function explainThemeScope(
    theme: ThemeRegistrationResolved,
    scope: string,
    parentScopes: string[],
): IRawThemeSetting[] {
    const result = []
    let resultLen = 0
    for (let i = 0, len = theme.settings.length; i < len; i++) {
        const setting = theme.settings[i]
        let selectors: string[]
        if (typeof setting.scope === 'string')
            selectors = setting.scope.split(/,/).map(scope => scope.trim())
        else if (Array.isArray(setting.scope))
            selectors = setting.scope
        else
            continue

        for (let j = 0, lenJ = selectors.length; j < lenJ; j++) {
            const rawSelector = selectors[j]
            const rawSelectorPieces = rawSelector.split(/ /)

            const selector = rawSelectorPieces[rawSelectorPieces.length - 1]
            const selectorParentScopes = rawSelectorPieces.slice(0, rawSelectorPieces.length - 1)

            if (matches(selector, selectorParentScopes, scope, parentScopes)) {
                // match!
                result[resultLen++] = setting
                // break the loop
                j = lenJ
            }
        }
    }
    return result
}

/**
 * Stack structure for maintaining semantic scopes.
 */
class ScopeStack {
    stack: SemanticScope[] = ['source']
    depth: number = 0

    /**
     * Push a new scope onto the stack.
     * @param newScope New scope to push.
     */
    push(newScope: SemanticScope) {
        this.stack.push(newScope)
        this.depth++
    }

    /**
     * Pop the scope from the top of the stack.
     */
    pop() {
        this.stack.pop()
        this.depth--
    }

    /**
     * Read the top of the stack.
     * @returns The semantic scope at the top of the stack.
     */
    top(): SemanticScope { return this.stack[this.depth] }

    /**
     * Read an entry from the top of the stack.
     * @param index The index of the stack entry to read.
     * @returns The semantic scope `index` entries from the top of the stack.
     */
    ancestor(index: number): SemanticScope { return this.stack[this.depth - index] }
}

/**
 * Cursor structure for managing the processing of a `ThemedToken`.
 */
class ParsedTokenCursor {
    /**
     * Parsed `ThemedToken` being processed.
     */
    parsed: ThemedToken
    /**
     * Array of explained subtokens of `parsed`.
     */
    subtokens: ExplainedSubtoken[]

    /**
     * New array of `ThemedToken`s being constructed from processing `parsed`.
     */
    newTokens: ThemedToken[] = []

    /**
     * Character offset into content of `parsed` that corresponds with content pushed onto `newTokens`.
     */
    offsetIntoParsed: number = 0
    /**
     * Index in `explained` of explained subtoken being processed.
     */
    subtokenIndex: number = 0

    /**
     * Theme used to create new `ThemedToken`s.
     */
    theme: ThemeRegistrationResolved

    constructor(parsed: ThemedToken, subtokens: ExplainedSubtoken[], theme: ThemeRegistrationResolved) {
        this.parsed = parsed
        this.subtokens = subtokens
        this.theme = theme
    }

    /**
     * @returns The subtoken currently being processed.
     */
    current(): ExplainedSubtoken { return this.subtokens[this.subtokenIndex] }

    /**
     * @returns `true` if there are subtokens remaining to process, `false` otherwise.
     */
    subtokensRemaining(): boolean { return this.subtokenIndex < this.subtokens.length }

    /**
     * Move this cursor forward to the next subtoken.
     */
    advance() { this.subtokenIndex++ }

    /**
     * Prevent the cursor from advancing once.
     */
    skipAdvance() { this.subtokenIndex-- }

    /**
     * Create a `ThemedToken` from an `ExplainedSubtoken` in `this.subtokens`.
     * @param subtoken `ExplainedSubtoken` to create a `ThemedToken` from.
     * @returns A `ThemedToken` based on `this.parsed` with content of `subtoken`.
     */
    createThemedTokenFromSubtoken(subtoken: ExplainedSubtoken): ThemedToken {
        const token = this.parsed
        const newToken = {
            content: subtoken.content,
            offset: token.offset,
            color: token.color,
            fontStyle: token.fontStyle,
            bgColor: token.bgColor,
            htmlStyle: token.htmlStyle,
            explanation: token.explanation ? [token.explanation[subtoken.index]] : undefined
        }
        return newToken
    }

    getFontStyle(fontStyleString?: string): FontStyle {
        let fontStyle: MyFontStyle = MyFontStyle.None
        if (fontStyleString) {
            if (fontStyleString.includes('bold'))
                fontStyle |= MyFontStyle.Bold

            if (fontStyleString.includes('italic'))
                fontStyle |= MyFontStyle.Italic

            if (fontStyleString.includes('underline'))
                fontStyle |= MyFontStyle.Underline
        }
        return fontStyle as unknown as FontStyle
    }

    /**
     * Create a new themed token from the current subtoken.
     * @param newScope Optional new scope to add to the new themed token.
     * @returns A new themed token, based on the original, with the content of the current subtoken and an additional new scope, if provided.
     */
    createNewThemedToken(newScope?: { name: string }): ThemedToken {
        const explained = this.current()
        // Setup new token based on previous token.
        const newToken: ThemedToken = this.createThemedTokenFromSubtoken(explained)
        // Setup token explanation.
        if (newToken.explanation)
            // If there's a new explanation, push it to the list of explanations.
            if (newScope) {
                const themeMatches = explainThemeScope(this.theme, newScope.name, explained.scopes)
                newToken.explanation[0].scopes.push({ scopeName: `${newScope.name}.sema`, themeMatches })
                // If we found a new theme match, update the token's formatting based on it.
                if (themeMatches.length > 0) {
                    newToken.color = themeMatches[themeMatches.length - 1].settings.foreground
                    newToken.fontStyle = this.getFontStyle(themeMatches[themeMatches.length - 1].settings.fontStyle)
                    if (!newToken.fontStyle)
                        newToken.fontStyle = 0
                }
            }
        return newToken
    }

    /**
     * Splits the given token at the specified character index.
     * @param token Token to split.  Expected to match `this.subtokens[this.subtokenIndex]`.
     * @param splitIndex Character index in `token.content` where split is to be made.
     */
    splitTokenAtIndex(
        token: ExplainedSubtoken,
        splitIndex: number
    ): void {
        const content = token.content
        const splitContent = content.substring(splitIndex)
        if (splitContent === '')
            return
        const splitToken: ExplainedSubtoken = { ...token }
        splitToken.content = splitContent
        token.content = content.substring(0, splitIndex)
        this.subtokens.splice(this.subtokenIndex + 1, 0, splitToken)
    }

    /**
     * Helper method to push a given token onto `newTokens` and update cursor accordingly.
     * @param token Token to push.
     */
    private _pushSubtoken(token: ThemedToken) {
        // Fix the contents of the new token, in case it excludes whitespace in the original parsed token.
        const explainedOffset = this.parsed.content.substring(this.offsetIntoParsed).indexOf(token.content)
        if (explainedOffset != 0)
            token.content = this.parsed.content.substring(this.offsetIntoParsed,
                this.offsetIntoParsed + explainedOffset + token.content.length)

        // Push the token
        token.offset = this.parsed.offset + this.offsetIntoParsed
        this.newTokens.push(token)

        // Update offsetIntoParsed
        this.offsetIntoParsed += token.content.length
    }

    /**
     * Push the given token onto the list of new tokens.
     * @param token Token to push.
     */
    pushNewToken(token: ThemedToken) {
        // Push subtokens before the current subtoken index.
        for (const subtoken of this.subtokens.slice(this.newTokens.length, this.subtokenIndex)) {
            this._pushSubtoken(this.createThemedTokenFromSubtoken(subtoken))
        }
        // Push the given token.
        this._pushSubtoken(token)
    }

    /**
     * Push the current subtoken onto the list of new tokens.
     * @param newScope Optional new scope to add to the new themed token.
     */
    pushCurrentSubtoken(newScope?: { name: string }) {
        this.pushNewToken(this.createNewThemedToken(newScope))
    }

    /**
     * Flush the current subtoken onto the list of new tokens.
     */
    flushCurrentSubtoken() {
        if (this.newTokens.length != 0) {
            this.pushCurrentSubtoken()
        }
    }
}

/**
 * Structure to maintain semantic program information about each point in a source program.
 */
class SemanticContext {
    /**
     * Stack of semantic scopes
     */
    scopeStack: ScopeStack = new ScopeStack
    /**
     * Non-builtin types defined in the program.
     */
    learnedTypes: string[] = []
    /**
     * Template parameters currently defined.
     */
    templateParameters: string[][] = []

    /**
     * Helper array to record parameters defined while processing a template.
     */
    newTemplateParameters: string[] = []

    /**
     * Check if the given content matches a non-builtin type.
     * @param content Content string to check.
     * @returns `true` if `content` matches one of the types in `learnedTypes` or `templateParameters`, `false` otherwise.
     */
    isKnownType(content: string): boolean {
        const type = content.trim().split(' ')[0]
        if (this.learnedTypes.includes(type))
            return true
        for (const parameterSet of this.templateParameters) {
            if (parameterSet.includes(type))
                return true
        }
        return false
    }

    /**
     * If the given content string matches a known non-builtin type, return that type.
     * @param content Content string to check.
     * @returns The type that matches `content`, if `content` matches a known type, or `''` otherwise.
     */
    getKnownType(content: string): string {
        const type = content.trim().split(' ')[0]
        if (this.learnedTypes.includes(type))
            return type
        for (const parameterSet of this.templateParameters) {
            if (parameterSet.includes(type))
                return type
        }
        return ''
    }

    /**
     * If the start of an explained subtoken is a known type, split that type from the explained subtoken.
     * @param explained Explained subtoken.
     * @param cursor Cursor for processing token associated with `explained`.
     * @returns Depending on the first word in `explained`, either that word, if the word is not a known type;
     * the empty string, if the word is a known type; or `undefined` on error.
     */
    splitTypeToken(
        explained: ExplainedSubtoken,
        cursor: ParsedTokenCursor
    ): string | undefined {
        const content = explained.content
        const type = this.getKnownType(content)
        if (type === '') {
            debug_print(`Failed to find known type in subtoken "${content}"`)
            return content.trim().split(' ')[0]
        }
        const typeIdx = content.indexOf(type)
        if (typeIdx < 0) {
            console.log(`ERROR: Type not found in subtoken "${content}"`)
            return undefined
        }
        cursor.splitTokenAtIndex(explained, typeIdx + type.length)
        return ''
    }

    /**
     * Add type to array of learned types.
     * @param newType Type to add.
     */
    learnType(newType: string) {
        this.learnedTypes.push(newType.trim())
    }

    /**
     * Push a new scope onto the scope stack.
     * @param newScope New scope to push.
     */
    pushScope(newScope: SemanticScope) {
        this.scopeStack.push(newScope)
        debug_print(this.scopeStack.stack)
    }

    /**
     * Pop the top of the scope stack.
     */
    popScope() {
        this.scopeStack.pop()
        debug_print(this.scopeStack.stack)
    }

    /**
     * Read the top of the scope stack.
     * @returns The semantic scope at the top of the stack.
     */
    topScope(): SemanticScope {
        return this.scopeStack.top()
    }

    /**
     * Check if the current semantic scope is the specified semantic scope.
     * @param scope Scope to test for.
     * @returns 'true' if the current scope is `scope`, `false` otherwise.
     */
    scopeIs(scope: SemanticScope): boolean {
        return this.topScope() === scope
    }

    /**
     * Check if the current semantic scope is any of the specified semantic scopes.
     * @param scopes Semantic scopes to test for.
     * @returns 'true' if the current scope is in `scopes`, `false` otherwise.
     */
    scopeIsAnyOf(scopes: SemanticScope[]): boolean {
        return scopes.includes(this.topScope())
    }

    /**
     * Read an entry from the top of the stack.
     * @param index The index of the stack entry to read.
     * @returns The semantic scope `index` entries from the top of the stack.
     */
    ancestor(index: number): SemanticScope {
        return this.scopeStack.ancestor(index)
    }

    /**
     * Record parameters discovered in the current template specification
     * as known template parameters.
     */
    pushTemplateParameters() {
        if (this.newTemplateParameters.length > 0) {
            this.templateParameters.push(this.newTemplateParameters)
            this.newTemplateParameters = []
        }
    }

    /**
     * If the top of the scope stack is `template`, pop it and update the set of template parameters accordingly.
     */
    maybePopTemplate() {
        if (this.scopeStack.top() === 'template') {
            this.scopeStack.pop()
            this.templateParameters.pop()
        }
    }

    /**
     * Checks whether this context has an empty scope stack.
     * @returns `true` if the scope stack is empty, `false` otherwise.
     */
    checkIfEmpty() {
        if (this.scopeStack.depth == 0)
            return true
        console.log("Unpopped scope stack!")
        debug_print(this.scopeStack)
        return false
    }
}

export function SemanticHighlight(tokens: ThemedToken[][], _theme: ThemeRegistrationResolved) {
    const ctx: SemanticContext = new SemanticContext
    let newType: string = ''
    const semanticTokens: ThemedToken[][] = []
    for (const token of tokens) {
        const semanticParsedTokens: ThemedToken[] = []
        for (const parsed of token) {
            const subtokens = getExplainedSubtokens(parsed)
            if (!subtokens) {
                // This token has no explanations.  Can't process it further, so just push it.
                semanticParsedTokens.push(parsed)
                continue
            }
            const cursor: ParsedTokenCursor = new ParsedTokenCursor(parsed, subtokens, _theme)
            for (; cursor.subtokensRemaining(); cursor.advance()) {
                const subtoken = cursor.current()
                const scopes = subtoken["scopes"]
                debug_print(subtoken)

                // Skip any only-whitespace tokens.
                const trimmed = subtoken.content.trim()
                if (trimmed === '') {
                    cursor.flushCurrentSubtoken()
                    continue
                }

                if (matchesAny(['comment'], scopes))
                    continue

                if (ctx.scopeIs('structure')) {
                    if (matchesAny(['punctuation.section.block.end.bracket.curly'], scopes)) {
                        // End of the structure scope.
                        // Pop the scope and templates, if present, and push this subtoken.
                        ctx.popScope()
                        ctx.maybePopTemplate()
                        cursor.pushCurrentSubtoken()
                        continue
                    } else if (matchesAny(['storage.type.struct', 'storage.type.union'], scopes)) {
                        // Nested structure type definition.
                        // Push vardef and struct.name to process it.
                        ctx.pushScope('vardef')
                        ctx.pushScope('struct.name')
                        continue
                    }
                }

                if (ctx.scopeIs('block')) {
                    if (matchesAny(['punctuation.section.block.end'], scopes)) {
                        // End of the block scope.
                        ctx.popScope()
                        // if (matchesAny(['punctuation.section.block.end.bracket.curly.namespace'], scopes))
                        //     // Pop the namespace scope as well.
                        //     ctx.popScope()
                        continue
                    }
                }

                if (ctx.scopeIs('template')) {
                    if (matchesAny(['storage.type.template.argument.typename'], scopes)) {
                        // Push a typename scope to process this typename.
                        ctx.pushScope('typename')
                        continue
                    } else if (matchesAny(['punctuation.section.angle-brackets.end.template'], scopes)) {
                        // End of the template scope.
                        ctx.pushTemplateParameters()
                        ctx.popScope()
                    } else if (ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        ctx.splitTypeToken(subtoken, cursor)
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        continue
                    }
                    cursor.flushCurrentSubtoken()
                }

                if (ctx.scopeIs('template.spec')) {
                    if (matchesAny(['punctuation.section.angle-brackets.end.template.call'], scopes)) {
                        // End of the template specification.
                        ctx.popScope()
                        // continue
                    } else if (trimmed === '<') {
                        // Mark this token as the start of a template call.
                        cursor.pushCurrentSubtoken({ name: 'punctuation.section.angle-brackets.begin.template.call' })
                        // Handle this template specification.
                        ctx.pushScope('template.spec')
                        continue
                    } else if (trimmed === '>') {
                        // End of the template specification.
                        cursor.pushCurrentSubtoken({ name: 'punctuation.section.angle-brackets.end.template.call' })
                        ctx.popScope()
                        ctx.maybePopTemplate()
                        continue
                    } else if (ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        ctx.splitTypeToken(subtoken, cursor)
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        continue
                    } else if (trimmed === '*') {
                        // Mark this subtoken as a pointer modifier.
                        cursor.pushCurrentSubtoken({ name: 'storage.modifier.pointer' })
                        continue
                    } else if (trimmed === '&') {
                        // Mark this subtoken as a reference modifier.
                        cursor.pushCurrentSubtoken({ name: 'storage.modifier.reference' })
                        continue
                    }
                    cursor.flushCurrentSubtoken()
                    continue
                }

                if (ctx.scopeIsAnyOf(['source', 'block', 'structure', 'template'])) {
                    if (matchesAny(['meta.function.definition'], scopes) && !matchesAny(['meta.function.definition.body', 'meta.body.function.definition'], scopes)) {
                        // Enter a function.head scope.
                        ctx.pushScope('function.head')
                    } else if (matchesAny(['punctuation.definition.capture.begin.lambda'], scopes)) {
                        // Enter a function.head scope.
                        ctx.pushScope('function.head')
                        // } else if (matchesAny(['storage.type.namespace.definition'], scopes)) {
                        //     // Enter a namespace scope.
                        //     ctx.pushScope('namespace')
                    } else if (matchesAny(['storage.type.template'], scopes)) {
                        // Enter a template scope.
                        ctx.pushScope('template')
                    } else if (matchesAny(['entity.name.scope-resolution'], scopes)) {
                        continue
                    } else if (matchesAny(['storage.type.struct', 'storage.type.union'], scopes)) {
                        // Structure type definition.  Push a vardef and struct.name to process it.
                        ctx.pushScope('vardef')
                        ctx.pushScope('struct.name')
                    } else if (ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        ctx.splitTypeToken(subtoken, cursor)
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        // Enter a vardef scope to process what comes after the type.
                        ctx.pushScope('vardef')
                    } else if (matchesAny(['storage.type.built-in', 'support.type.built-in'], scopes)) {
                        // Enter a vardef scope to process what comes after the type.
                        ctx.pushScope('vardef')
                    } else if (matchesAny(['keyword.other.using', 'keyword.other.typedef'], scopes)) {
                        // Enter a typedef scope to process the type definition.
                        ctx.pushScope('typedef')
                    } else if (matchesAny(['punctuation.section.block.begin.bracket.curly.struct', 'punctuation.section.block.begin.bracket.curly.class', 'punctuation.section.block.begin.bracket.curly.union'], scopes)) {
                        // Enter a structure scope to process the structure definition.
                        ctx.pushScope('vardef')
                        ctx.pushScope('structure')
                    } else if (matchesAny(['entity.name.type'], scopes)) {
                        // Add this type to the set of learned types.
                        ctx.learnType(subtoken.content)
                        // Enter a vardef scope to process what comes after the type.
                        ctx.pushScope('vardef')
                    } else if (matchesAny(['entity.name.type.alias', 'entity.name.type.class'], scopes)) {
                        // Add this type to the set of learned types.
                        ctx.learnType(subtoken.content)
                    }
                    continue
                }

                if (ctx.scopeIs('typename')) {
                    if (matchesAny(['entity.name.type.template'], scopes)) {
                        // Add this name to the set of known template parameters.
                        ctx.newTemplateParameters.push(subtoken.content)
                    } else if (subtoken.content === ',') {
                        // End of this typename.
                        ctx.popScope()
                    } else if (matchesAny(['punctuation.section.angle-brackets.end.template'], scopes)) {
                        // End of this template.
                        // Push the learned template parameters, pop this scope, and process this token in the parent scope.
                        ctx.pushTemplateParameters()
                        ctx.popScope()
                        cursor.skipAdvance()
                    }
                    continue
                }

                if (ctx.scopeIs('typedef')) {
                    if (matchesAny(['entity.name.type'], scopes)) {
                        // Save this subtoken as a possible new type to learn.
                        newType = trimmed
                    } else if (matchesAny(['variable.other.unknown', 'variable.other.object.declare', 'meta.body.function', 'meta.body.struct', 'meta.tail.struct', 'meta.body.class', 'meta.block', 'meta.parens', 'source'], scopes.slice(-1))) {
                        // Record the new type to learn.
                        const unsplitType = ctx.splitTypeToken(subtoken, cursor)
                        // Mark this subtoken as a type.
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        if (unsplitType)
                            newType = unsplitType
                        continue
                    } else if (matchesAny(['punctuation.terminator.statement'], scopes)) {
                        // End of this typedef.
                        if (newType != '') {
                            // Learn any new type found.
                            ctx.learnType(newType)
                            newType = ''
                        }
                        // Pop this typedef scope and any templates.
                        ctx.popScope()
                        ctx.maybePopTemplate()
                    } else if (matchesAny(['keyword.operator.assignment'], scopes)) {
                        // Push an assignment.rhs scope to handle the right-hand side of this assignment.
                        ctx.pushScope('assignment')
                    } else if (matchesAny(['storage.type.struct', 'storage.type.union'], scopes)) {
                        // Push a struct.name scope to handle the name associated with this structure.
                        ctx.pushScope('struct.name')
                    } else if (matchesAny(['punctuation.section.block.begin.bracket.curly'], scopes)) {
                        // Push a structure scope to process this structure definition.
                        ctx.pushScope('structure')
                    } else if (ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        ctx.splitTypeToken(subtoken, cursor)
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        continue
                    } else if (matchesAny(['variable.other.definition.pointer.function'], scopes)) {
                        // Mark this subtoken as a type.
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        continue
                    }
                    cursor.flushCurrentSubtoken()
                    continue
                }

                if (ctx.scopeIs('struct.name')) {
                    if (matchesAny(['punctuation.section.block.begin.bracket.curly'], scopes)) {
                        // End of this structure name.
                        // Pop this scope and process this subtoken in the parent scope.
                        cursor.skipAdvance()
                        ctx.popScope()
                        continue
                    }
                    if (!matchesAny(['entity.name.type'], scopes)) {
                        // This subtoken is not yet recognized as a type.
                        // Split subtoken at its first word.
                        const wordSplit = trimmed.split(/(?<=^\S+)\s/)
                        if (wordSplit.length > 1) {
                            const splitIndex = subtoken.content.indexOf(wordSplit[0]) + wordSplit[0].length
                            cursor.splitTokenAtIndex(subtoken, splitIndex)
                        }
                        // Mark this subtoken as a type.
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type' })
                    }
                    // Finish processing this structure name.
                    ctx.popScope()
                    continue
                }

                if (ctx.scopeIs('function.head')) {
                    if (matchesAny(['punctuation.terminator.statement'], scopes)) {
                        // End of the function head.
                        // Pop this scope and any templates.
                        ctx.popScope()
                        ctx.maybePopTemplate()
                    } else if (matchesAny(['punctuation.section.block.begin.bracket.curly'], scopes)) {
                        // Start of the function body.
                        // Pop this scope and enter the function.body scope.
                        ctx.popScope()
                        ctx.pushScope('function.body')
                    } else if (matchesAny(['keyword.operator.assignment'], scopes)) {
                        ctx.pushScope('vardefaftername')
                        ctx.pushScope('assignment')
                    }
                    cursor.flushCurrentSubtoken()
                    continue
                }

                if (ctx.scopeIs('function.body')) {
                    if (matchesAny(['punctuation.section.block.begin.bracket.curly'], scopes)) {
                        // Enter this nested function.body scope.
                        ctx.pushScope('function.body')
                    } else if (matchesAny(['punctuation.section.block.end.bracket.curly'], scopes)) {
                        // End of this scope.  Pop it and any templates.
                        ctx.popScope()
                        ctx.maybePopTemplate()
                    } else if (matchesAny(['punctuation.definition.capture.begin.lambda'], scopes)) {
                        // Enter a function.head scope.
                        ctx.pushScope('function.head')
                    } else if (matchesAny(['keyword.control.for', 'keyword.control.cilk_for'], scopes) ||
                        (matchesAny(['keyword.control'], scopes) && trimmed === 'for')) {
                        // Push a loop.ctl scope.
                        ctx.pushScope('loop')
                    } else if (matchesAny(['punctuation.section.parens.begin', 'punctuation.section.arguments.begin.bracket.round.function.call', 'punctuation.definition.parameters.begin', 'punctuation.section.parameters.begin'], scopes)) {
                        // Push a parens scope to process the contents in parentheses.
                        ctx.pushScope('parens')
                    } else if (matchesAny(['punctuation.section.angle-brackets.begin.template.call'], scopes)) {
                        // Enter template.spec scope to handle this template call.
                        ctx.pushScope('vardef')
                        ctx.pushScope('template.spec')
                    } else if (matchesAny(['keyword.operator.cast'], scopes)) {
                        // Enter cast scope to handle this cast operation.
                        ctx.pushScope('cast')
                    } else if (matchesAny(['entity.name.scope-resolution'], scopes)) {
                        continue
                    } else if (matchesAny(['storage.type'], scopes)) {
                        // Enter vardef to process a possible variable definition.
                        ctx.pushScope('vardef')
                    } else if (ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        // Enter vardef to process a possible variable definition.
                        ctx.pushScope('vardef')
                    } else if (matchesAny(['entity.name.type'], scopes)) {
                        // Enter vardef to process a possible variable definition.
                        ctx.pushScope('vardef')
                    }
                    cursor.flushCurrentSubtoken()
                    continue
                }

                if (ctx.scopeIs('vardef')) {
                    if (matchesAny(['entity.name.function.call.cpp'], scopes)) {
                        // Constructor call.  Mark this variable name as a definition.
                        cursor.pushCurrentSubtoken({ name: 'variable.other.declare' })
                        ctx.pushScope('vardefaftername')
                        continue
                    } else if (matchesAny(['entity.name.function'], scopes)) {
                        // The function name indicates this isn't a variable definition.
                        // Mark this subtoken as a function definition, and switch to a function.head scope.
                        cursor.pushCurrentSubtoken({ name: 'entity.name.function.definition' })
                        ctx.popScope()
                        ctx.pushScope('function.head')
                        continue
                    } else if (matchesAny(['meta.function.definition.parameters'], scopes)) {
                        // Switch to function.head to process the function parameters.
                        ctx.popScope()
                        ctx.pushScope('function.head')
                    } else if (matchesAny(['punctuation.section.block.begin.bracket.curly'], scopes)) {
                        // Push a structure scope to process the structure definition.
                        ctx.pushScope('structure')
                    } else if (matchesAny(['punctuation.terminator.statement'], scopes)) {
                        // End of this variable definition.
                        ctx.popScope()
                        cursor.flushCurrentSubtoken()
                        continue
                    } else if (matchesAny(['punctuation.separator.delimiter.comma'], scopes)) {
                        // End of this variable definition.
                        ctx.popScope()
                        cursor.flushCurrentSubtoken()
                        continue
                    } else if (trimmed === '<') {
                        // Mark this subtoken as the start of a template specification.
                        cursor.pushCurrentSubtoken({ name: 'punctuation.section.angle-brackets.begin.template' })
                        // Enter template.spec to process the template specification.
                        ctx.pushScope('template.spec')
                        continue
                    } else if (ctx.ancestor(1) === 'template' && trimmed === '>') {
                        // End of the parent template.
                        // Pop this scope and process this subtoken in the parent.
                        ctx.popScope()
                        cursor.skipAdvance()
                        continue
                    } else if (matchesAny(['punctuation.section.arguments.begin.bracket.round.function.call'], scopes)) {
                        // Actually a function call, not a variable definition.
                        // Pop this scope and process this subtoken in the parent.
                        ctx.popScope()
                        cursor.skipAdvance()
                        continue
                    } else if (matchesAny(['storage.modifier.specifier.cilk_reducer'], scopes)) {
                        // Start of a Cilk reducer specification.
                        ctx.pushScope('parens')
                    } else if (matchesAny(['variable.other.declare', 'variable.other.object', 'variable.other.unknown', 'variable.object', 'variable.other.assignment'], scopes.slice(-1))) {
                        // Mark this variable as a definition.
                        cursor.pushCurrentSubtoken({ name: 'variable.other.declare' })
                        ctx.pushScope('vardefaftername')
                        continue
                    } else if (matchesAny(['meta.body.function', 'meta.body.struct', 'meta.tail.struct', 'meta.body.class', 'meta.body.union', 'meta.tail.union', 'meta.block', 'meta.parens', 'source'], scopes.slice(-1))) {
                        // Process this variable definition.
                        // Split at any ':' or '[' characters to get the variable name itself.
                        let splitIndex = -1
                        if (matchesAny(['meta.body.struct', 'meta.body.class', 'meta.body.union', 'meta.block'], scopes.slice(-1))) {
                            splitIndex = subtoken.content.indexOf(':')
                            if (splitIndex > 0) {
                                // Bitfield description.  Split at the ':'.
                                cursor.splitTokenAtIndex(subtoken, splitIndex)
                            } else if (splitIndex < 0) {
                                splitIndex = subtoken.content.indexOf('[')
                                if (splitIndex > 0)
                                    // Array member.
                                    cursor.splitTokenAtIndex(subtoken, splitIndex)
                            }
                        }
                        if (splitIndex === 0) {
                            cursor.pushCurrentSubtoken()
                            continue
                        }
                        // Mark this variable name as a definition.
                        cursor.pushCurrentSubtoken({ name: 'variable.other.declare' })
                        ctx.pushScope('vardefaftername')
                        continue
                    } else if (matchesAny(['punctuation.separator.colon.range-based'], scopes)) {
                        // End of this variable definition.
                        ctx.popScope()
                        cursor.flushCurrentSubtoken()
                        continue
                    } else if (subtoken.content === '*') {
                        // Mark this subtoken as a pointer modifier.
                        cursor.pushCurrentSubtoken({ name: 'storage.modifier.pointer' })
                        continue
                    } else if (subtoken.content === '&') {
                        // Mark this subtoken as a reference modifier.
                        cursor.pushCurrentSubtoken({ name: 'storage.modifier.reference' })
                        continue
                    }
                    cursor.flushCurrentSubtoken()
                    continue
                }

                if (ctx.scopeIs('vardefaftername')) {
                    if (matchesAny(['punctuation.terminator.statement', 'punctuation.definition.capture.end.lambda', 'punctuation.separator.colon.range-based'], scopes)) {
                        // End of this assignment.  Process this subtoken in the parent scope.
                        ctx.popScope()
                        cursor.skipAdvance()
                        continue
                    } else if (matchesAny(['punctuation.definition.begin.bracket.square'], scopes)) {
                        // Start of an array index.  Push an arrayidx scope to process it.
                        ctx.pushScope('arrayidx')
                    } else if (matchesAny(['keyword.operator.assignment'], scopes)) {
                        // Push an assignment.rhs scope to process the right-hand side of this assignment.
                        ctx.pushScope('assignment')
                    } else if (matchesAny(['punctuation.separator.delimiter'], scopes)) {
                        // End of this variable definition.
                        ctx.popScope()
                    }
                    cursor.flushCurrentSubtoken()
                    continue
                }

                if (ctx.scopeIs('loop')) {
                    if (matchesAny(['punctuation.section.block.begin.bracket.curly'], scopes)) {
                        ctx.popScope()
                        // Process the body in the parent scope.
                        cursor.skipAdvance()
                    } if (matchesAny(['storage.type'], scopes)) {
                        // Enter vardef to process a possible variable definition.
                        ctx.pushScope('vardef')
                    } else if (ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        // Enter vardef to process a possible variable definition.
                        ctx.pushScope('vardef')
                    }
                }

                if (ctx.scopeIsAnyOf(['parens', 'loop'])) {
                    if (matchesAny(['punctuation.section.parens.end.bracket.round', 'punctuation.section.arguments.end.bracket.round.function.call', 'punctuation.definition.parameters.end', 'punctuation.section.parameters.end'], scopes)) {
                        // End of the parens scope.
                        ctx.popScope()
                    } else if (!matchesAny(['entity.name.scope-resolution'], scopes) && ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        ctx.splitTypeToken(subtoken, cursor)
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        continue
                    } else if (matchesAny(['punctuation.definition.parameters.begin.lambda'], scopes)) {
                        // Enter a function.head scope.
                        ctx.pushScope('function.head')
                    }
                    cursor.flushCurrentSubtoken()
                }

                if (ctx.scopeIs('assignment')) {
                    if (matchesAny(['punctuation.terminator.statement', 'punctuation.definition.capture.end.lambda'], scopes)) {
                        // End of this assignment.  Process this subtoken in the parent scope.
                        ctx.popScope()
                        cursor.skipAdvance()
                    } else if (matchesAny(['punctuation.separator.delimiter'], scopes)) {
                        // End of this assignment.
                        ctx.popScope()
                        cursor.skipAdvance()
                    } else if (matchesAny(['punctuation.section.parens.begin', 'punctuation.section.arguments.begin.bracket.round.function.call', 'punctuation.definition.parameters.begin'], scopes)) {
                        // Push a parens scope to process the contents in parentheses.
                        ctx.pushScope('parens')
                    } else if (matchesAny(['keyword.operator.cast'], scopes)) {
                        // Enter cast scope to handle this cast operation.
                        ctx.pushScope('cast')
                    } else if (ctx.ancestor(1) === 'template' && trimmed === '>') {
                        // End of the parent template scope.  Pop this scope and process this subtoken in the parent.
                        ctx.popScope()
                        cursor.skipAdvance()
                    } else if (ctx.isKnownType(subtoken.content)) {
                        // Mark this subtoken as a type.
                        ctx.splitTypeToken(subtoken, cursor)
                        cursor.pushCurrentSubtoken({ name: 'entity.name.type.defined' })
                        continue
                    } else if (matchesAny(['punctuation.section.angle-brackets.begin.template.call'], scopes)) {
                        ctx.pushScope('template.spec')
                        continue
                    } else if (matchesAny(['variable.parameter.capture'], scopes)) {
                        cursor.pushCurrentSubtoken({ name: 'variable.parameter.initializer' })
                    }
                    cursor.flushCurrentSubtoken()
                }

                if (ctx.scopeIs('cast')) {
                    if (matchesAny(['punctuation.section.angle-brackets.begin.template.call'], scopes)) {
                        cursor.flushCurrentSubtoken()
                        // Handle this template specification.
                        ctx.pushScope('template.spec')
                    } else if (matchesAny(['punctuation.section.angle-brackets.end.template.call'], scopes)) {
                        cursor.flushCurrentSubtoken()
                        // End of the template specification.  Pop the scope and any templates.
                        ctx.popScope()
                        ctx.maybePopTemplate()
                    } else if (trimmed === '<') {
                        // Mark this token as the start of a template call.
                        cursor.pushCurrentSubtoken({ name: 'punctuation.section.angle-brackets.begin.template.call' })
                        // Handle this template specification.
                        ctx.pushScope('template.spec')
                    } else if (matchesAny(['punctuation.section.parens.begin'], scopes)) {
                        // Push a parens scope to process the contents in parentheses.
                        ctx.pushScope('parens')
                    } else if (matchesAny(['punctuation.terminator.statement'], scopes)) {
                        // End of this variable definition.
                        ctx.popScope()
                        cursor.skipAdvance()
                    } else if (matchesAny(['punctuation.separator.delimiter'], scopes)) {
                        // End of this assignment.
                        ctx.popScope()
                        cursor.skipAdvance()
                    }
                    continue
                }

                if (ctx.scopeIs('arrayidx')) {
                    if (matchesAny(['punctuation.definition.end.bracket.square'], scopes))
                        // End of this array index expression.
                        ctx.popScope()
                    cursor.flushCurrentSubtoken()
                }

                if (matchesAny(['punctuation.section.block.begin'], scopes)) {
                    // Start of a block scope.
                    ctx.pushScope('block')
                } else if (matchesAny(['punctuation.section.block.end'], scopes)) {
                    // End of a block scope.
                    ctx.popScope()
                    // if (matchesAny(['punctuation.section.block.end.bracket.curly.namespace'], scopes))
                    //     // End the namespace scope as well.
                    //     ctx.popScope()
                } else if (matchesAny(['punctuation.section.angle-brackets.begin.template'], scopes)) {
                    // Start of a template.
                    ctx.pushScope('template')
                } else if (matchesAny(['punctuation.definition.capture.begin.lambda'], scopes)) {
                    // Enter a function.head scope.
                    ctx.pushScope('function.head')
                }
            }
            if (cursor.newTokens.length === 0) {
                // No new tokens were pushed, so just push the original token.
                semanticParsedTokens.push(parsed)
            } else {
                for (const newToken of cursor.newTokens) {
                    semanticParsedTokens.push(newToken)
                }
            }
        }
        semanticTokens.push(semanticParsedTokens)
    }
    // Check if the context is empty.  We don't do anything with the result of this check,
    // but the output is helpful for debugging.
    ctx.checkIfEmpty()
    return semanticTokens
}
