//must remain independent from vscode

import * as PostCss from 'postcss';
import { Stylesheet, Resolver, fromCSS } from 'stylable';
const PostCssNested = require('postcss-nested');
const PostCssSafe = require('postcss-safe-parser');
import * as _ from 'lodash';

import { getDefinition, isClassDefinition, ClassDefinition, SymbolDefinition } from "./utils/get-definitions";
import { getPositionInSrc, isContainer, isDeclaration, isInNode, isSelector, pathFromPosition } from "./utils/postcss-ast-utils";
import {
    parseSelector,
    isSelectorChunk,
    isSelectorInternalChunk
} from './utils/selector-analyzer';


const processor = PostCss([PostCssNested]);

export class ProviderPosition {
    constructor(public line: number, public character: number) { }
}

export class ProviderRange {
    constructor(public start: ProviderPosition, public end: ProviderPosition) { }
}


export class Completion {
    constructor(public label: string, public detail: string = "", public sortText: string = 'd', public insertText: string | snippet = label,
        public range?: ProviderRange, public additionalCompletions: boolean = false) {

    }
}

export class snippet {
    constructor(public source: string) { }
}


function singleLineRange(line: number, start: number, end: number): ProviderRange {
    return {
        start: {
            line: line,
            character: start
        },
        end: {
            line: line,
            character: end
        }
    }
}


// Completions
// CompItemKinds for icons:
//  .<class> - Class
// value(<var>) -> Variable
// -st-named -> (var -> Variable, cls -> Class)
// :<state> -> Enum
// :vars -> Keyword
// :import -> Keyword
// -st-* directive -> Keyword
//
const rootClass = new Completion('.root', 'The root class', 'b');
function importsDirective(rng: ProviderRange) {
    return new Completion(':import', 'Import an external library', 'a', new snippet(':import {\n\t-st-from: "$1";\n}'), rng);
}
const extendsDirective = new Completion('-st-extends:', 'Extend an external component', 'a', new snippet('-st-extends: $1;'), undefined, true);
const statesDirective = new Completion('-st-states:', 'Define the CSS states available for this class', 'a', new snippet('-st-states: $1;'));
const mixinDirective = new Completion('-st-mixin:', 'Apply mixins on the class', 'a', new snippet('-st-mixin: $1;'));
const variantDirective = new Completion('-st-variant:', '', 'a', new snippet('-st-variant: true;'));
const fromDirective = new Completion('-st-from:', 'Path to library', 'a', new snippet('-st-from: "$1";'));
const namedDirective = new Completion('-st-named:', 'Named object export name', 'a', new snippet('-st-named: $1;'));
const defaultDirective = new Completion('-st-default:', 'Default object export name', 'a', new snippet('-st-default: $1;'));
function classCompletion(className: string) {
    return new Completion('.' + className, 'mine', 'b')
}
function extendCompletion(symbolName: string, range?: ProviderRange) {
    return new Completion(symbolName, 'yours', 'a', new snippet(' ' + symbolName + ';\n'), range)
}
function stateCompletion(stateName: string, from: string, pos: ProviderPosition) {
    return new Completion(':' + stateName, 'from: ' + from, 'a', new snippet(':' + stateName), singleLineRange(pos.line, pos.character - 1, pos.character));
}
// end completions


type CompletionMap = { [s: string]: Completion };


function addExistingClasses(stylesheet: Stylesheet | undefined, completions: Completion[]) {
    if (stylesheet == undefined)
        return;
    Object.keys(stylesheet.classes).forEach((className: string) => {
        if (className === 'root') {
            return;
        }

        completions.push(classCompletion(className));
    });
}

function isIllegalLine(line: string): boolean {
    return !!/^\s*[-\.:]*\s*$/.test(line)
}

function isSimple(selector: string) {
    if (selector.match(/[:> ]/)) {
        return false;
    }
    if (selector.indexOf('.') !== 0) {
        return false
    };
    if (selector.lastIndexOf('.') !== 0) {
        return false;
    }
    return true;
}



const lineEndsRegexp = /({|}|;)/;

export interface FsEntity extends SymbolDefinition {
    type: string;
    globalPath: string;
}

export interface File extends FsEntity {
    type: 'file';
}
export interface Dir extends FsEntity {
    type: 'dir';
}

export interface ExtendedResolver extends Resolver {
    resolveDependencies(stylesheet: Stylesheet): Thenable<void>;
    getFolderContents(folderPath: string): Thenable<FsEntity[]>;
}

function isSpacy(char: string) {
    return char === '' || char === ' ' || char === '\t' || char === '\n';
}

export default class Provider {
    public getClassDefinition(stylesheet: Stylesheet, symbol: string, resolver: ExtendedResolver) {
        const symbols = resolver.resolveSymbols(stylesheet);

    }

    public provideCompletionItemsFromSrc(
        src: string,
        position: ProviderPosition,
        filePath: string,
        resolver: ExtendedResolver
    ): Thenable<Completion[]> {

        // debugger;
        let cursorLineIndex: number = position.character;
        let lines = src.split('\n');
        let currentLine = lines[position.line];
        let fixedSrc = src;
        console.log('Current line I: ', currentLine);
        if (currentLine.match(lineEndsRegexp)) {
            let currentLocation = 0;
            let splitLine = currentLine.split(lineEndsRegexp);
            for (var i = 0; i < splitLine.length; i += 2) {
                currentLocation += splitLine[i].length + 1;
                if (currentLocation >= position.character) {
                    currentLine = splitLine[i];
                    console.log('Current line II: ', currentLine);
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


        console.log('Made fixedSrc');
        console.log(fixedSrc);


        let ast: PostCss.Root;
        try {
            const res = processor.process(fixedSrc, {
                parser: PostCssSafe
            });
            ast = res.root;
        } catch (error) {
            console.log(error);
            return Promise.resolve([]);
        }
        console.log('PostCSS successful');

        let stylesheet: Stylesheet | undefined = undefined;
        console.log('Transpiling Stylesheet');
        try {
            stylesheet = fromCSS(fixedSrc, undefined, filePath);
            console.log('Transpiling Stylesheet success');
        } catch (error) {
            console.log('Transpiling Stylesheet fail');
            console.error('stylable transpiling failed');
        }

        console.log('Calling resolveDependencies');
        return resolver.resolveDependencies(stylesheet!)
            .then<Completion[]>(() => {
                console.log('Calling AST completions with: ')
                console.log('position: ', JSON.stringify(position, null, '\t'))
                console.log('currentLine: ', JSON.stringify(currentLine, null, '\t'))
                console.log('cursorLineIndex: ', JSON.stringify(cursorLineIndex, null, '\t'), '\n')
                return this.provideCompletionItemsFromAst(src, position, filePath, resolver, ast, stylesheet!, currentLine, cursorLineIndex)
            });

    }
    public provideCompletionItemsFromAst(
        src: string,
        position: ProviderPosition,
        filePath: string,
        resolver: ExtendedResolver,
        ast: PostCss.Root,
        stylesheet: Stylesheet,
        currentLine: string,
        cursorLineIndex: number
    ): Thenable<Completion[]> {
        console.log('Starting provideCompletionItemsFromAst')
        debugger;
        const completions: Completion[] = [];
        const trimmedLine = currentLine.trim();

        const position1Based: ProviderPosition = {
            line: position.line + 1,
            character: position.character
        }
        const path = pathFromPosition(ast, position1Based);

        const posInSrc = getPositionInSrc(src, position);
        const lastChar = src.charAt(posInSrc);
        const lastPart: PostCss.NodeBase = path[path.length - 1];
        const prevPart: PostCss.NodeBase = path[path.length - 2];

        const lastSelector = prevPart && isSelector(prevPart) ? prevPart :
            lastPart && isSelector(lastPart) ? lastPart : null
        if (lastSelector) {
            if (lastChar === '-' || isSpacy(lastChar) || lastChar == "{") {
                if (lastSelector.selector === ':import') {
                    completions.push(...getNewCompletions({
                        "-st-from": fromDirective,
                        "-st-default": defaultDirective,
                        "-st-named": namedDirective
                    }, lastSelector));
                } else {

                    const declarationBlockDirectives: CompletionMap = {
                        '-st-mixin': mixinDirective
                    };
                    if (isSimple(lastSelector.selector)) {
                        declarationBlockDirectives["-st-extends"] = extendsDirective;
                        declarationBlockDirectives["-st-variant"] = variantDirective;
                        declarationBlockDirectives["-st-states"] = statesDirective;
                    }
                    completions.push(...getNewCompletions(declarationBlockDirectives, lastSelector));
                }
            } else if (stylesheet && lastChar == ":" && trimmedLine.split(':').length === 2) {
                if (trimmedLine.indexOf('-st-extends:') === 0) {
                    stylesheet.imports.forEach((importJson) => {
                        if (importJson.from.lastIndexOf('.css') === importJson.from.length - 4 && importJson.defaultExport) {
                            completions.push(extendCompletion(importJson.defaultExport));
                        }
                    });
                } else if (trimmedLine.indexOf('-st-from:') === 0) {
                    debugger;
                }

            }
        }
        if (trimmedLine.length < 2) {
            if ((lastChar === ':' || isSpacy(lastChar)) && (<PostCss.Root>lastPart).type === 'root' ) {
                completions.push(importsDirective(new ProviderRange(new ProviderPosition(position.line, Math.max(0, position.character - 1)), position)));
            }
            if (lastChar === '.' || isSpacy(lastChar)) {
                completions.push(rootClass);
                addExistingClasses(stylesheet, completions);
            }
        } else if (lastChar === ':' && stylesheet !== undefined) {

            const selectorRes = parseSelector(currentLine, cursorLineIndex);//position.character);

            const focusChunk = selectorRes.target.focusChunk;
            if (!Array.isArray(focusChunk) && isSelectorChunk(focusChunk)) {// || isSelectorInternalChunk(focusChunk)
                focusChunk.classes.forEach((className) => {
                    const clsDef = getDefinition(stylesheet, className, resolver)
                    if (isClassDefinition(clsDef)) {
                        clsDef.states.forEach((stateDef) => {
                            if (focusChunk.states.indexOf(stateDef.name) !== -1) { return }
                            const from = 'from: ' + stateDef.from;
                            completions.push(stateCompletion(stateDef.name, stateDef.from, position))
                        })
                    }
                })
            }
        }

        return Promise.resolve(completions);
    }
}

function getSelectorFromPosition(src: string, index: number) {

}

function getNewCompletions(completionMap: CompletionMap, ruleset: PostCss.Rule): Completion[] {
    ruleset.nodes!.forEach(node => {
        let dec = node as PostCss.Declaration;
        if (completionMap[dec.prop]) {
            delete completionMap[dec.prop]
        }
    });
    return Object.keys(completionMap).map(name => completionMap[name]);
}
