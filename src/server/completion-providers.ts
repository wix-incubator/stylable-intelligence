import { StylableMeta, SRule, valueMapping, ClassSymbol, CSSResolve, VarSymbol, ImportSymbol, StylableResolver, Stylable } from 'stylable';
import { evalDeclarationValue } from 'stylable'
import { CursorPosition, SelectorInternalChunk, SelectorChunk } from "./utils/selector-analyzer";
import {
    classCompletion,
    Completion,
    extendCompletion,
    globalCompletion,
    importDirectives,
    importInternalDirective,
    cssMixinCompletion,
    namedCompletion,
    pseudoElementCompletion,
    rulesetDirectives,
    rulesetInternalDirective,
    stateCompletion,
    topLevelDirective,
    topLevelDirectives,
    valueCompletion,
    valueDirective,
    codeMixinCompletion,
} from './completion-types';
import { isContainer, isDeclaration, isComment, isVars } from './utils/postcss-ast-utils';
import * as PostCss from 'postcss';
import * as path from 'path';
import Provider, { extractTsSignature, extractJsModifierRetrunType, isDirective, getNamedValues, isInValue, getExistingNames } from './provider';
import { TypeReferenceNode, Identifier } from 'typescript';
import { MinimalDocs } from './provider-factory';
const pvp = require('postcss-value-parser');
import { toVscodePath } from './utils/uri-utils';
import { Declaration } from 'postcss';
import { ResolvedElement } from 'stylable/dist/src/stylable-transformer';
import { keys, findLast, last } from 'lodash';
import { ExtendedFSReadSync, ExtendedTsLanguageService } from './types';
import * as ts from 'typescript';

export interface ProviderOptions {
    meta: StylableMeta,
    fs: ExtendedFSReadSync,
    styl: Stylable,
    src: string,
    tsLangService: ExtendedTsLanguageService,
    resolvedElements: ResolvedElement[][],
    parentSelector: SRule | null,
    astAtCursor: PostCss.NodeBase,
    lineChunkAtCursor: string,
    lastSelectoid: string,
    fullLineText: string,
    position: ProviderPosition,
    resolved: CSSResolve[],
    currentSelector: string,
    target: CursorPosition
    isMediaQuery: boolean,
    fakes: PostCss.Rule[],
}

export interface CompletionProvider {
    provide(options: ProviderOptions): Completion[]
}

export class ProviderPosition {
    constructor(public line: number, public character: number) { }
}

export class ProviderRange {
    constructor(public start: ProviderPosition, public end: ProviderPosition) { }
}

export class ProviderLocation {
    constructor(public uri: string, public range: ProviderRange) { }
}

const cssPseudoClasses = [
    'active',
    'any',
    'checked',
    'default',
    'dir()',
    'disabled',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'focus',
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'lang()',
    'last-child',
    'last-of-type',
    'left',
    'link',
    'not()',
    'nth-child()',
    'nth-last-child()',
    'nth-last-of-type()',
    'nth-of-type()',
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'valid',
    'visited',
];

// const cssPseudoElements = [
//     '::after',
//     '::before',
//     '::cue',
//     '::first-letter',
//     '::first-line',
//     '::selection',
// ]

export function createRange(startLine: number, startPos: number, endline: number, endPos: number) {
    return new ProviderRange(new ProviderPosition(startLine, startPos), new ProviderPosition(endline, endPos));
}

function createDirectiveRange(position: ProviderPosition, fullLineText: string, lineChunkAtCursor: string): ProviderRange {
    return new ProviderRange(
        new ProviderPosition(
            position.line,
            Math.max(0, position.character -
                (topLevelDirectives.customSelector.startsWith(fullLineText)
                    ? fullLineText.length
                    : lineChunkAtCursor.length))),
        position
    );
}

const importDeclarations: (keyof typeof importDirectives)[] = ['default', 'named', 'from', 'theme']
const simpleRulesetDeclarations: (keyof typeof rulesetDirectives)[] = ['extends', 'states', 'variant', 'mixin']
const topLevelDeclarations: (keyof typeof topLevelDirectives)[] = ['root', 'namespace', 'vars', 'import', 'customSelector']




//Providers
//Syntactic

// Inside :import ruleset, which is not inside media query
// If directive doesn't already exist
export const ImportInternalDirectivesProvider: CompletionProvider = {
    provide({ parentSelector, isMediaQuery, fullLineText, position, lineChunkAtCursor }: ProviderOptions): Completion[] {
        if (parentSelector && parentSelector.selector === ':import'
            && !isMediaQuery
        ) {
            const res: Completion[] = [];
            importDeclarations.forEach(name => {
                if (parentSelector!.nodes!.every(n => isDeclaration(n) && importDirectives[name] !== n.prop || isComment(n))
                    && importDirectives[name].indexOf(fullLineText.trim()) === 0) {
                    res.push(importInternalDirective(name, createDirectiveRange(position, fullLineText, lineChunkAtCursor)))
                }
            })
            return res;
        } else {
            return [];
        }
    }
}

// Inside ruleset, which is not :import or :vars
// Only inside simple selector, except -st-mixin
// If directive doesn't already exist
export const RulesetInternalDirectivesProvider: CompletionProvider & { isSimpleSelector: (sel: string) => boolean } = {
    provide({ parentSelector, isMediaQuery, fullLineText, position, lineChunkAtCursor }: ProviderOptions): Completion[] {
        let res: Completion[] = [];
        if (parentSelector && !(parentSelector.selector === ':import' || parentSelector.selector === ':vars')) {
            if (parentSelector.nodes!.every(n => (isDeclaration(n) && rulesetDirectives.mixin !== n.prop) || isComment(n))
                && rulesetDirectives['mixin'].indexOf(fullLineText.trim()) === 0) {
                res.push(rulesetInternalDirective('mixin', createDirectiveRange(position, fullLineText, lineChunkAtCursor)))
            }
            if (this.isSimpleSelector(parentSelector.selector) && !isMediaQuery) {
                simpleRulesetDeclarations.filter(d => d !== 'mixin').forEach(name => {
                    if (parentSelector!.nodes!.every(n => (isDeclaration(n) && rulesetDirectives[name] !== n.prop) || isComment(n))
                        && rulesetDirectives[name].indexOf(fullLineText.trim()) === 0) {
                        res.push(rulesetInternalDirective(name, createDirectiveRange(position, fullLineText, lineChunkAtCursor)))
                    }
                })
            }
            return res;
        } else {
            return [];
        }
    },
    isSimpleSelector(sel: string) {
        return !!/^\s*\.?[\w-]*$/.test(sel) //Only a single class or element
    }
}

// Only top level
// :vars, @namespace may not repeat
export const TopLevelDirectiveProvider: CompletionProvider = {
    provide({ parentSelector, isMediaQuery, fullLineText, position, lineChunkAtCursor, meta }: ProviderOptions): Completion[] {
        if (!parentSelector) {
            if (!isMediaQuery) {
                return topLevelDeclarations
                    .filter(d => !/@namespace/.test((meta.ast.source.input as any).css) || (d !== 'namespace'))
                    .filter(d => topLevelDirectives[d].indexOf(fullLineText.trim()) === 0)
                    .map(d => topLevelDirective(d, createDirectiveRange(position, fullLineText, lineChunkAtCursor)));
            } else {
                return [topLevelDirective('root', createDirectiveRange(position, fullLineText, lineChunkAtCursor))]
            }
        } else {
            return [];
        }
    },
}

// Inside ruleset, which is not :import
// RHS of declaration
// Declaration is not -st-directive (except -st-mixin)
// Not inside another value()
export const ValueDirectiveProvider: CompletionProvider & { isInsideValueDirective: (wholeLine: string, pos: number) => boolean } = {
    provide({ parentSelector, fullLineText, position }: ProviderOptions): Completion[] {
        if (parentSelector && !isDirective(fullLineText) && !this.isInsideValueDirective(fullLineText, position.character)
            && fullLineText.indexOf(':') !== -1) {
            const parsed = pvp(fullLineText.slice(fullLineText.indexOf(':') + 1)).nodes;
            const node = parsed[parsed.length - 1];
            if (
                node.type === 'div' || node.type === 'space'
                || node.type === 'function' && !node.unclosed
                || node.type === 'word' && 'value()'.startsWith(node.value)
            ) {
                return [valueDirective(new ProviderRange(
                    new ProviderPosition(
                        position.line,
                        fullLineText.includes(',')
                            ? fullLineText.lastIndexOf(',') + 1
                            : fullLineText.indexOf(':') + 1),
                    position
                ))]
            } else {
                return [];
            }
        } else {
            return [];
        }
    },

    isInsideValueDirective(wholeLine: string, pos: number) {
        if (!/value\(/.test(wholeLine)) { return false }
        let line = wholeLine.slice(0, pos).slice(wholeLine.lastIndexOf('value('));
        let stack = 0;
        for (let i = 0; i <= line.length; i++) {
            if (line[i] === '(') {
                stack += 1
            } else if (line[i] === ')') {
                stack -= 1
            }
        }
        return stack > 0;
    }
}

// Selector level
export const GlobalCompletionProvider: CompletionProvider = {
    provide({ parentSelector, fullLineText, position, lineChunkAtCursor }: ProviderOptions): Completion[] {
        if (!parentSelector && !lineChunkAtCursor.endsWith('::')) {

            let offset = 0;
            if (fullLineText.lastIndexOf(':') !== -1) {
                if (':global()'.startsWith(lineChunkAtCursor.slice(lineChunkAtCursor.lastIndexOf(':')))) {
                    offset = lineChunkAtCursor.slice(lineChunkAtCursor.lastIndexOf(':')).length;
                }
            }
            return [globalCompletion(
                new ProviderRange(
                    new ProviderPosition(
                        position.line,
                        position.character - offset
                    ),
                    position
                )
            )];
        } else {
            return [];
        }
    },
}

//Semantic

// Selector level
// Not after :, unless entire chunk is :
export const SelectorCompletionProvider: CompletionProvider = {
    provide({ parentSelector, fullLineText, position, lineChunkAtCursor, meta, fakes, styl }: ProviderOptions): Completion[] {
        if (!parentSelector && (lineChunkAtCursor === ':' || !lineChunkAtCursor.endsWith(':'))) {
            let comps: Completion[] = [];
            comps.push(...keys(meta.classes)
                .filter(c => c !== 'root' && fakes.findIndex(f => f.selector === '.' + c) === -1)
                .map(c => classCompletion(c, (createDirectiveRange(position, fullLineText, lineChunkAtCursor)))));
            comps.push(...keys(meta.customSelectors)
                .map(c => classCompletion(c, (createDirectiveRange(position, fullLineText, lineChunkAtCursor)), true)));
            let moreComps = meta.imports
                .filter(imp => imp.fromRelative.endsWith('st.css'))
                .reduce((acc: Completion[], imp) => {
                    if (acc.every(comp => comp.label !== imp.defaultExport)) { acc.push(classCompletion(imp.defaultExport, createDirectiveRange(position, fullLineText, lineChunkAtCursor), true)) };
                    keys(imp.named).forEach(exp => {
                        const res = styl.resolver.resolve(meta.mappedSymbols[exp]);
                        if (res && res._kind === 'css' && res.symbol && (res.symbol._kind === 'class' || res.symbol._kind === 'element') &&
                            (acc.every(comp => comp.label.replace('.', '') !== imp.named[exp]))) {
                            acc.push(classCompletion(imp.named[exp], (createDirectiveRange(position, fullLineText, lineChunkAtCursor))))
                        }
                    });
                    return acc;
                }, comps)
            return moreComps.filter(c => c.label.startsWith(lineChunkAtCursor));
        } else {
            return [];
        }
    },
}

// Inside ruleset of simple selector, not :import or :vars
// RHS of -st-extends
export const ExtendCompletionProvider: CompletionProvider = {
    provide({ lineChunkAtCursor, position, meta, styl }: ProviderOptions): Completion[] {
        if (lineChunkAtCursor.startsWith(valueMapping.extends)) {
            let value = lineChunkAtCursor.slice((valueMapping.extends + ':').length);
            let spaces = value.search(/\S|$/);
            let str = value.slice(spaces);
            let comps: string[][] = [[]];
            comps.push(...Object.keys(meta.classes).filter(s => s.startsWith(str)).map(s => [s, 'Local file']))
            meta.imports.forEach(i => { if (i.defaultExport && i.defaultExport.startsWith(str) && i.from.endsWith('st.css')) { comps.push([i.defaultExport, i.fromRelative]) } })
            meta.imports.forEach(i => comps.push(...keys(i.named)
                .filter(s => {
                    const res = styl.resolver.resolve(meta.mappedSymbols[s]);
                    return res && res._kind === 'css' && (res.symbol._kind === 'class' || res.symbol._kind === 'element')
                })
                .filter(s => s.startsWith(str))
                .map(s => [s, i.fromRelative])))
            return comps.slice(1).map(c => extendCompletion(
                c[0],
                c[1],
                new ProviderRange(
                    new ProviderPosition(position.line, position.character - str.length),
                    position
                ),
            ));
        } else {
            return [];
        }
    },
}

// Inside ruleset, which is not :import or :vars
// RHS of -st-extends
export const CssMixinCompletionProvider: CompletionProvider = {
    provide({ lineChunkAtCursor, meta, position, fullLineText }: ProviderOptions): Completion[] {
        if (lineChunkAtCursor.startsWith(valueMapping.mixin + ':')) {

            const { names, lastName } = getExistingNames(fullLineText, position)
            return Object.keys(meta.mappedSymbols)
                .filter(ms => ((meta.mappedSymbols[ms]._kind === 'import' && (meta.mappedSymbols[ms] as ImportSymbol).import.fromRelative.endsWith('st.css')) || meta.mappedSymbols[ms]._kind === 'class'))
                .filter(ms => ms.startsWith(lastName))
                .filter(ms => names.indexOf(ms) === -1)
                .map(ms => {
                    return cssMixinCompletion(
                        ms,
                        new ProviderRange(
                            new ProviderPosition(position.line, position.character - lastName.length),
                            position
                        ),
                        meta.mappedSymbols[ms]._kind === 'import' ? (meta.mappedSymbols[ms] as ImportSymbol).import.fromRelative : 'Local file'
                    )
                });
        } else {
            return [];
        }

    },
}

// Mixin completions
// Inside ruleset, which is not :import or :vars
// Only inside simple selector
// RHS of -st-mixin
// There is  a JS/TS import
export const CodeMixinCompletionProvider: CompletionProvider = {
    provide({ parentSelector, meta, fullLineText, lineChunkAtCursor, position, fs, tsLangService, styl }: ProviderOptions): Completion[] {
        if (meta.imports.some(imp => imp.fromRelative.endsWith('.ts') || imp.fromRelative.endsWith('.js')) &&
            !fullLineText.trim().startsWith(valueMapping.from) &&
            parentSelector && lineChunkAtCursor.startsWith(valueMapping.mixin + ':')
        ) {
            if (fullLineText.lastIndexOf('(') > fullLineText.lastIndexOf(')')) { return [] }

            const { names, lastName } = getExistingNames(fullLineText, position)
            return Object.keys(meta.mappedSymbols)
                .filter(ms => meta.mappedSymbols[ms]._kind === 'import')
                .filter(ms => ms.startsWith(lastName))
                .filter(ms => {
                    const res = styl.resolver.resolve(meta.mappedSymbols[ms])
                    return res && res._kind === 'js'
                })
                .filter(ms => isMixin(ms, meta, fs, tsLangService))
                .map(ms => createCodeMixinCompletion(ms, lastName, position, meta));
        } else {
            return [];
        }
    },
}

// Inside ruleset, which is not :import
// RHS of any rule except -st-extends, -st-from
export const FormatterCompletionProvider: CompletionProvider = {
    provide({ meta, fullLineText, parentSelector, lineChunkAtCursor, position, fs, tsLangService, styl }: ProviderOptions): Completion[] {
        if (
            meta.imports.some(imp => imp.fromRelative.endsWith('.ts') || imp.fromRelative.endsWith('.js')) &&
            !fullLineText.trim().startsWith(valueMapping.from) && !fullLineText.trim().startsWith(valueMapping.extends) && !fullLineText.trim().startsWith(valueMapping.named) &&
            parentSelector && fullLineText.includes(':') && fullLineText.indexOf(':') < position.character &&
            !lineChunkAtCursor.startsWith(valueMapping.mixin + ':')
        ) {
            const { names, lastName } = getExistingNames(fullLineText, position)
            return Object.keys(meta.mappedSymbols)
                .filter(ms => (meta.mappedSymbols[ms]._kind === 'import'))
                .filter(ms => ms.startsWith(lastName))
                .filter(ms => {
                    const res = styl.resolver.resolve(meta.mappedSymbols[ms])
                    return res && res._kind === 'js'
                })
                // .filter(ms => names.length === 0 || !names.includes(ms))
                .filter(ms => !isMixin(ms, meta, fs, tsLangService))
                .map(ms => createCodeMixinCompletion(ms, lastName, position, meta));
        } else {
            return [];
        }
    },
}

// Inside :import
// RHS of -st-named
// import exists
export const NamedCompletionProvider: CompletionProvider & { resolveImport: (importName: string, styl: Stylable, meta: StylableMeta) => StylableMeta | null } = {
    provide({ parentSelector, astAtCursor, styl, meta, position, fullLineText, src }: ProviderOptions): Completion[] {

        const { isNamedValueLine, namedValues } = getNamedValues(src, position.line);
        if (isNamedValueLine) {

            let importName: string = '';
            if (parentSelector && parentSelector.selector === ':import' && (astAtCursor as PostCss.Rule).nodes && (astAtCursor as PostCss.Rule).nodes!.length) {
                importName = ((astAtCursor as PostCss.Rule).nodes!.find(n => (n as PostCss.Declaration).prop === valueMapping.from) as PostCss.Declaration).value.replace(/'|"/g, '');
            } else { return [] }

            let comps: string[][] = [[]];

            if (importName.endsWith('.st.css')) {

                const resolvedImport: StylableMeta | null = this.resolveImport(importName, styl, meta);
                if (resolvedImport) {
                    const { names, lastName } = getExistingNames(fullLineText, position)
                    comps.push(
                        ...keys(resolvedImport.mappedSymbols)
                            .filter(ms => (resolvedImport.mappedSymbols[ms]._kind === 'class' || resolvedImport.mappedSymbols[ms]._kind === 'var') && ms !== 'root')
                            .filter(ms => ms.slice(0, -1).startsWith(lastName))
                            .filter(ms => !namedValues.includes(ms))
                            .map(ms => [
                                ms,
                                path.relative(meta.source, resolvedImport.source).slice(1).replace(/\\/g, '/'),
                                resolvedImport.mappedSymbols[ms]._kind === 'var' ? (resolvedImport.mappedSymbols[ms] as VarSymbol).text : 'Stylable class'
                            ])
                    )
                    return comps.slice(1).map(c => namedCompletion(
                        c[0],
                        new ProviderRange(
                            new ProviderPosition(position.line, position.character - lastName.length),
                            new ProviderPosition(position.line, position.character)
                        ),
                        c[1],
                        c[2]
                    ));
                }
            } else if (importName.endsWith('.js') || importName.endsWith('.ts')) {

            }

        }
        return [];
    },

    resolveImport(importName: string, styl: Stylable, meta: StylableMeta): StylableMeta | null {
        let resolvedImport: StylableMeta | null = null;
        if (importName && importName.endsWith('.st.css')) try {
            resolvedImport = styl.fileProcessor.process(meta.imports.find(i => i.fromRelative === importName)!.from);
        } catch (e) { }
        return resolvedImport;
    },
}

export const PseudoElementCompletionProvider: CompletionProvider = {
    provide({ parentSelector, resolved, resolvedElements, lastSelectoid, lineChunkAtCursor, meta, position }: ProviderOptions): Completion[] {
        let comps: any[] = [];
        if (!parentSelector && resolved.length > 0) {

            const lastNode = resolvedElements[0][resolvedElements[0].length - 1];
            const states = lastNode.resolved.reduce((acc, cur) => {
                acc = acc.concat(keys((cur.symbol as ClassSymbol)[valueMapping.states]))
                return acc;
            }, cssPseudoClasses)

            let filter = lastNode.resolved.length
                ? states.includes(lastSelectoid.replace(':', ''))
                    ? ''
                    : lastSelectoid.replace(':', '')
                : lastNode.name;

            const scope = filter
                ? resolvedElements[0][resolvedElements[0].length - 2]
                : lastNode;

            const colons = lineChunkAtCursor.match(/:*$/)![0].length;


            scope.resolved.forEach(res => {
                if (!(res.symbol as ClassSymbol)[valueMapping.root]) { return }

                comps = comps.concat(keys(res.meta.classes)
                    .concat(keys(res.meta.customSelectors).map(s => s.slice(':--'.length)))
                    .filter(e => e.startsWith(filter) && e !== 'root')
                    .map(c => {
                        let relPath = path.relative(path.dirname(meta.source), res.meta.source)
                        if (!relPath.startsWith('.')) { relPath = './' + relPath }

                        return pseudoElementCompletion(c, relPath, new ProviderRange(
                            new ProviderPosition(position.line, position.character - (filter ? filter.length + 2 : colons)),
                            new ProviderPosition(position.line, position.character),
                        ));
                    }));
            });


            let otherScope;
            if (!filter && lineChunkAtCursor.split('::').length > 1 && last(lineChunkAtCursor.split('::')) === scope.name) {
                otherScope = resolvedElements[0][resolvedElements[0].length - 2];
                filter = scope.name;
            }
            if (otherScope) {
                otherScope.resolved.forEach(res => {
                    if (!(res.symbol as ClassSymbol)[valueMapping.root]) { return }

                    comps = comps.concat(keys(res.meta.classes)
                        .concat(keys(res.meta.customSelectors).map(s => s.slice(':--'.length)))
                        .filter(e => e.startsWith(filter) && e !== 'root')
                        .map(c => {
                            let relPath = path.relative(path.dirname(meta.source), res.meta.source)
                            if (!relPath.startsWith('.')) { relPath = './' + relPath }

                            return pseudoElementCompletion(c, relPath, new ProviderRange(
                                new ProviderPosition(position.line, position.character - (filter ? filter.length + 2 : colons)),
                                new ProviderPosition(position.line, position.character),
                            ));
                        }));
                });
            }
        }
        return comps;
    },
}

export const StateCompletionProvider: CompletionProvider = {
    provide({ parentSelector, lineChunkAtCursor, resolvedElements, target, lastSelectoid, meta, position }: ProviderOptions): Completion[] {
        if (!parentSelector && !lineChunkAtCursor.endsWith('::')) {

            const lastNode = resolvedElements[0][resolvedElements[0].length - 1];
            const chunk = Array.isArray(target.focusChunk) ? last(target.focusChunk) : target.focusChunk
            const chunkyStates = (chunk && (chunk as SelectorChunk).states) ? (chunk as SelectorChunk).states : [];
            const allStates = lastNode.resolved.reduce((acc, cur) => {
                acc.push(...keys((cur.symbol as ClassSymbol)[valueMapping.states]))
                return acc;
            }, [] as string[])

            const newStates = lastNode.resolved.reduce((acc, cur) => {
                let relPath = path.relative(path.dirname(meta.source), cur.meta.source)
                if (!relPath.startsWith('.')) { relPath = './' + relPath }
                keys((cur.symbol as ClassSymbol)[valueMapping.states]).forEach(k => {
                    if (
                        !acc[k] &&
                        (
                            k.slice(0, -1).startsWith(lastSelectoid.replace(':', '')) || //selectoid is a substring of current state
                            allStates.includes(lastSelectoid.replace(':', '')) //selectoid is a valid state TODO: selectoid is both
                        ) &&
                        (chunkyStates.every(cs => cs !== k))
                    ) { acc[k] = meta.source === cur.meta.source ? 'Local file' : relPath }
                })
                return acc;
            }, {} as { [k: string]: string });

            let states = keys(newStates).map(k => [k, newStates[k]]);
            if (states.length === 0) { return [] };

            const lastState = lastSelectoid.replace(':', '');
            const realState = allStates.includes(lastState);
            return states.reduce((acc: Completion[], st) => {
                acc.push(stateCompletion(st[0], st[1], (new ProviderRange(
                    new ProviderPosition(
                        position.line,
                        lastState
                            ? realState
                                ? position.character - (lineChunkAtCursor.endsWith(':') ? 1 : 0)
                                : position.character - (lastState.length + 1) - (lineChunkAtCursor.endsWith(':') ? 1 : 0)
                            : position.character - (lineChunkAtCursor.endsWith(':') ? 1 : 0)
                    ),
                    position)
                )));
                return acc;
            }, [])
        } else {
            return [];
        }
    },
}

export const ValueCompletionProvider: CompletionProvider = {
    provide({ fullLineText, position, meta, styl }: ProviderOptions): Completion[] {
        if (isInValue(fullLineText, position)) {
            let inner = fullLineText.slice(0, fullLineText.indexOf(')', position.character) + 1).slice(fullLineText.slice(0, fullLineText.indexOf(')', position.character) + 1).lastIndexOf('(')).replace('(', '').replace(')', '').trim();

            let comps: Completion[] = [];
            meta.vars.forEach(v => {
                if (v.name.startsWith(inner) && !fullLineText.slice(0, fullLineText.indexOf(':')).includes(v.name)) {
                    const value = evalDeclarationValue(styl.resolver, v.text, meta, v.node)
                    comps.push(valueCompletion(v.name, 'Local variable', value, new ProviderRange(
                        new ProviderPosition(position.line, position.character - inner.length),
                        position,
                    )))
                }
            })

            const importVars: any[] = [];
            meta.imports.forEach(imp => {
                try {
                    styl.fileProcessor.process(imp.from).vars.forEach(v => importVars.push({ name: v.name, value: v.text, from: imp.fromRelative, node: v.node }))
                } catch (e) { }
            })

            importVars.forEach(v => {
                if (v.name.startsWith(inner) && meta.imports.some(imp => Object.keys(imp.named).some(key => key === v.name))) {
                    const value = evalDeclarationValue(styl.resolver, v.value, meta, v.node)
                    comps.push(valueCompletion(v.name, v.from, value, new ProviderRange(
                        new ProviderPosition(position.line, position.character - inner.length),
                        position,
                    )))
                }
            })
            return comps;
        } else {
            return [];
        }
    },
}

function createCodeMixinCompletion(name: string, lastName: string, position: ProviderPosition, meta: StylableMeta) {
    return codeMixinCompletion(
        name,
        new ProviderRange(
            new ProviderPosition(position.line, position.character - lastName.length),
            position
        ),
        (meta.mappedSymbols[name] as ImportSymbol).import.fromRelative
    )
}

function isMixin(name: string, meta: StylableMeta, fs: ExtendedFSReadSync, tsLangService: ExtendedTsLanguageService) {
    const importSymbol = (meta.mappedSymbols[name] as ImportSymbol);
    if (importSymbol.import.fromRelative.endsWith('.ts')) {
        const sig = extractTsSignature(importSymbol.import.from, name, importSymbol.type === 'default', tsLangService)
        if (!sig) { return false; }
        let rtype = sig.declaration.type
            ? ((sig.declaration.type as TypeReferenceNode).typeName as Identifier).getText()
            : "";
        return (/(\w+.)?stCssFrag/.test(rtype.trim()));
    } if (importSymbol.import.fromRelative.endsWith('.js')) {
        return (extractJsModifierRetrunType(name, 0, fs.get(toVscodePath(importSymbol.import.from)).getText()) === 'stCssFrag')
    }
    return false;
}
