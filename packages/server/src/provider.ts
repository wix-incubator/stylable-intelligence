import { CSSResolve, valueMapping } from 'stylable/dist/src';
//must remain independent from vscode

import * as PostCss from 'postcss';
import { StylableMeta, process as stylableProcess, safeParse, SRule, Stylable } from 'stylable';
import { isSelector, pathFromPosition } from './utils/postcss-ast-utils';
import {
    ImportInternalDirectivesProvider,
    RulesetInternalDirectivesProvider,
    TopLevelDirectiveProvider,
    SelectorCompletionProvider,
    ExtendCompletionProvider,
    PseudoElementCompletionProvider,
    StateCompletionProvider,
    ProviderPosition,
    ProviderOptions,
    NamedCompletionProvider,
    ValueDirectiveProvider,
    ValueCompletionProvider
} from './completion-providers'
import { Completion, } from './completion-types';
import { parseSelector, } from './utils/selector-analyzer';
import { Declaration } from 'postcss';


export function isIllegalLine(line: string): boolean {
    return /^\s*[-\.:]+\s*$/.test(line)
}

const lineEndsRegexp = /({|}|;)/;

export function createMeta(src: string, path: string) {
    let meta: StylableMeta;
    let fakes: PostCss.Rule[] = [];
    try {
        let ast: PostCss.Root = safeParse(src, { from: createFrom(path) })
        ast.nodes && ast.nodes.forEach((node) => {
            if (node.type === 'decl') {
                let r = PostCss.rule({ selector: node.prop + ':' + node.value });
                r.source = node.source;
                node.replaceWith(r);
                fakes.push(r)
            }
        })
        if (ast.raws.after && ast.raws.after.trim()) {
            let r = PostCss.rule({ selector: ast.raws.after.trim() })
            ast.append(r);
            fakes.push(r);
        }

        meta = stylableProcess(ast);
    } catch (error) {
        return { meta: null, fakes: fakes };
    }
    return {
        meta: meta,
        fakes: fakes
    }
}

function createFrom(filePath: string): string | undefined {
    return filePath.indexOf('file://') === 0 ? decodeURIComponent(filePath.slice(7 + Number(process.platform === 'win32'))) : decodeURIComponent(filePath);
}


export default class Provider {
    constructor(public styl: Stylable) { }

    providers = [
        new RulesetInternalDirectivesProvider(),
        new ImportInternalDirectivesProvider(),
        new TopLevelDirectiveProvider(),
        new ValueDirectiveProvider(),
        new SelectorCompletionProvider(),
        new ExtendCompletionProvider(),
        new NamedCompletionProvider(),
        new StateCompletionProvider(),
        new PseudoElementCompletionProvider(),
        new ValueCompletionProvider(),
    ]

    public provideCompletionItemsFromSrc(
        src: string,
        position: ProviderPosition,
        filePath: string,
    ): Thenable<Completion[]> {
        // debugger;
        let cursorLineIndex: number = position.character;
        let lines = src.split('\n');
        let currentLine = lines[position.line];
        let fixedSrc = src;
        if (currentLine.match(lineEndsRegexp)) {
            let currentLocation = 0;
            let splitLine = currentLine.split(lineEndsRegexp);
            for (var i = 0; i < splitLine.length; i += 2) {
                currentLocation += splitLine[i].length + 1;
                if (currentLocation >= position.character) {
                    currentLine = splitLine[i];
                    if (isIllegalLine(currentLine)) {
                        splitLine[i] = '\n'
                        lines.splice(position.line, 1, splitLine.join(''));
                        fixedSrc = lines.join('\n');
                    }
                    break;
                } else {
                    cursorLineIndex -= splitLine[i].length + 1
                }
            }
        }
        else if (isIllegalLine(currentLine)) {
            lines.splice(position.line, 1, "");
            fixedSrc = lines.join('\n');
        }

        let processed = createMeta(fixedSrc, filePath);
        return this.provideCompletionItemsFromAst(src, position, processed.meta!, processed.fakes, currentLine, cursorLineIndex);

    }



    public provideCompletionItemsFromAst(
        src: string,
        position: ProviderPosition,
        meta: StylableMeta,
        fakes: PostCss.Rule[],
        currentLine: string,
        cursorLineIndex: number
    ): Thenable<Completion[]> {
        const completions: Completion[] = [];
        let options = this.createProviderOptions(src, position, meta, fakes, currentLine, cursorLineIndex)

        this.providers.forEach(p => {
            options.isLineStart = p.text.some((s: string) => s.indexOf(currentLine.trim()) === 0)
            completions.push(...p.provide(options))
        }
        );
        return Promise.resolve(completions);
    }

    private createProviderOptions(
        src: string,
        position: ProviderPosition,
        meta: StylableMeta,
        fakes: PostCss.Rule[],
        currentLine: string,
        cursorLineIndex: number): ProviderOptions {

        const path = pathFromPosition(meta.rawAst, { line: position.line + 1, character: position.character });
        const lastPart: PostCss.NodeBase = path[path.length - 1];
        const prevPart: PostCss.NodeBase = path[path.length - 2];
        const isMediaQuery = path.some(n => (n as PostCss.Container).type === 'atrule' && (n as PostCss.AtRule).name === 'media');
        const isDirective = Object.keys(valueMapping).some(k => currentLine.indexOf((valueMapping as any)[k]) !== -1)


        const lastRule: SRule | null = prevPart && isSelector(prevPart) && fakes.findIndex((f) => { return f.selector === prevPart.selector }) === -1
            ? <SRule>prevPart
            : lastPart && isSelector(lastPart) && fakes.findIndex((f) => { return f.selector === lastPart.selector }) === -1
                ? <SRule>lastPart
                : null

        const wholeLine = currentLine;
        while (currentLine.lastIndexOf(' ') > cursorLineIndex) {
            currentLine = currentLine.slice(0, currentLine.lastIndexOf(' '))
        }
        if (currentLine.lastIndexOf(' ') === cursorLineIndex) { currentLine = currentLine.slice(0, currentLine.lastIndexOf(' ')) }

        if (!isDirective && currentLine.lastIndexOf(' ') > 0 && currentLine.lastIndexOf(' ') < cursorLineIndex) {
            cursorLineIndex -= (currentLine.lastIndexOf(' ') + 1);
            currentLine = currentLine.slice(currentLine.lastIndexOf(' '));
        }

        let trimmedLine = currentLine.trim();
        let postDirectiveSpaces = (Object.keys(valueMapping).some(k => { return trimmedLine.startsWith((valueMapping as any)[k]) })) ? currentLine.match((/:(\s*)\w?/))![1].length : 0
        let postValueSpaces = (Object.keys(valueMapping).some(k => { return trimmedLine.startsWith((valueMapping as any)[k]) && trimmedLine.indexOf(',') !== -1 }))
            ? (currentLine.replace(/^\s*/, '').match(/\s+/) || [''])[0].length
            : 0
        let ps = parseSelector(trimmedLine, cursorLineIndex);

        let chunkStrings: string[] = ps.selector.map(s => s.text).reduce((acc, arr) => { return acc.concat(arr) }, []);
        let remain = cursorLineIndex;
        let pos = chunkStrings.findIndex(str => {
            if (str.length >= remain) {
                return true;
            } else {
                remain -= str.length;
                return false;
            }
        })

        let rev = chunkStrings.slice().reverse();
        pos -= Math.max(rev.findIndex(s => !/^:+/.test(s) || /^:--/.test(s)), 0)
        let currentSelector = /^:+/.test(chunkStrings[pos]) ? chunkStrings[Math.max(pos - 1, 0)] : chunkStrings[pos]
        if (currentSelector && currentSelector.startsWith('.')) { currentSelector = currentSelector.slice(1) }
        let resolved = currentSelector
            ? Object.keys(meta.customSelectors).some(k => k === currentSelector)
                ? this.styl.resolver.resolveExtends(meta, meta.customSelectors[currentSelector].match(/[^\w:]*([\w:]+)$/)![1].split('::').reverse()[0].split(':')[0], currentSelector[0] === currentSelector[0].toUpperCase())
                : this.styl.resolver.resolveExtends(meta, currentSelector, currentSelector[0] === currentSelector[0].toUpperCase())
            : [];
        let pseudo = (trimmedLine.match(/::\w+/))
            ? (trimmedLine.endsWith('::')
                ? trimmedLine.split('::').reverse()[1].split(':')[0]
                : this.isFinalPseudo(resolved, trimmedLine)
                    ? trimmedLine.split('::').reverse()[0].split(':')[0]
                    : trimmedLine.split('::').length > 2
                        ? trimmedLine.split('::').reverse()[1].split(':')[0]
                        : null
            )
            : null;

        let resolvedPseudo = pseudo ? this.styl.resolver.resolveExtends(resolved[resolved.length - 1].meta, pseudo) : [];
        let isImport = !!lastRule && (lastRule.selector === ':import');
        let fromNode: Declaration | undefined = isImport ? (lastRule!.nodes as Declaration[]).find(n => n.prop === valueMapping.from) : undefined;
        let importName = (isImport && fromNode) ? fromNode.value.replace(/'/g, '').replace(/"/g, '') : '';
        let resolvedImport: StylableMeta | null = null;
        if (importName) try {
            resolvedImport = this.styl.fileProcessor.process(meta.imports.find(i => i.fromRelative === importName)!.from);
        } catch (e) {
            resolvedImport = null;
        }
        let customSelectorType = '';
        if (trimmedLine.startsWith(':--')) {
            let customSelector = trimmedLine.match(/^(:--\w*)/)![1];
            let expanded = meta.customSelectors[customSelector];
            if (expanded) {
                let ps_exp = parseSelector(expanded, expanded.length)
                customSelectorType = Array.isArray(ps_exp.target.focusChunk) ? ps_exp.target.focusChunk[0].type : (ps_exp.target.focusChunk as any).type
            }
        }

        let isInValue: boolean = false;

        if (/value\(/.test(wholeLine)) {
            let line = wholeLine.slice(0, position.character);
            let stack = 0;
            for (let i = 0; i <= line.length; i++) {
                if (line[i] === '(') {
                    stack += 1
                } else if (line[i] === ')') {
                    stack -= 1
                }
            }
            if (stack > 0) { isInValue = true }
        }

        let importVars: any[] = [];
        meta.imports.forEach(imp => {
            try {
                this.styl.fileProcessor.process(imp.from).vars.forEach(v => importVars.push({ name: v.name, value: v.value, from: imp.fromRelative }))
            } catch (e) { }
        })

        return {
            meta: meta,
            lastRule: lastRule,
            trimmedLine: trimmedLine,
            wholeLine: wholeLine,
            postDirectiveSpaces: postDirectiveSpaces,
            postValueSpaces: postValueSpaces,
            position: position,
            isTopLevel: !lastRule,
            isLineStart: false,
            isImport: isImport,
            isDirective: isDirective,
            resolvedImport: resolvedImport,
            insideSimpleSelector: !!lastRule && !!/^\s*\.?\w*$/.test(lastRule.selector),
            resolved: resolved,
            currentSelector: currentSelector,
            target: ps.target,
            isMediaQuery: isMediaQuery,
            hasNamespace: /@namespace/.test(src),
            fakes: fakes,
            pseudo: pseudo,
            resolvedPseudo: resolvedPseudo,
            customSelector: customSelectorType,
            isInValue: isInValue,
            importVars: importVars,
        }
    }


    private isFinalPseudo(resolved: CSSResolve[], trimmedLine: string) {
        let curMeta: StylableMeta = resolved[resolved.length - 1].meta;
        let pseudos: string[] = trimmedLine.split('::').slice(1).map(s => s.split(':')[0]);
        let res = true;
        for (let i = 0; i < pseudos.length; i++) {
            let tmp = this.styl.resolver.resolveExtends(curMeta, pseudos[i], false);
            if (tmp.length === 0) { res = false; break; }
            curMeta = tmp[tmp.length - 1].meta;
        }

        return res;
    }
}
