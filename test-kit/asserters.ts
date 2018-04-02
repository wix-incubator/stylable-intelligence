import { expect } from 'chai';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { NodeBase } from 'postcss';
import { Stylable } from 'stylable';
import { TextDocument } from 'vscode-languageserver-types';
import { SignatureHelp, ParameterInformation, Location } from 'vscode-languageserver';
import { Color, ColorInformation } from 'vscode-css-languageservice';
import { createProvider, MinimalDocs, createFs } from '../src/lib/provider-factory'
import { Completion, snippet } from '../src/lib/completion-types';
import { ProviderPosition, ProviderRange } from '../src/lib/completion-providers';
import { createMeta, default as Provider, ProviderLocation } from '../src/lib/provider';
import { pathFromPosition } from '../src/lib/utils/postcss-ast-utils'
import { fromVscodePath, toVscodePath } from '../src/lib/utils/uri-utils';
import { LocalSyncFs } from '../src/lib/local-sync-fs';
import { createDocFs } from '../src/lib/server';
import { createLanguageServiceHost, createBaseHost } from '../src/lib/utils/temp-language-service-host';
import { ExtendedTsLanguageService } from '../src/lib/types';
import { CssService } from '../src/model/css-service';
import { resolveDocumentColors } from '../src/lib/feature/color-provider';
const pkgDir = require('pkg-dir');

export const CASES_PATH = path.join(pkgDir.sync(__dirname), 'fixtures', 'server-cases');

function assertPresent(actualCompletions: Completion[], expectedCompletions: Partial<Completion>[], prefix: string = '') {
    expectedCompletions.forEach(expected => {
        const actual = actualCompletions.find((comp) => comp.label === expected.label);
        expect(actual, 'Completion not found: ' + expected.label + ' ' + 'with prefix ' + prefix + ' ').to.not.be.equal(undefined);
        if (actual) {
            for (var field in expected) {
                let actualVal: any = (actual as any)[field];
                if (actualVal instanceof snippet) {
                    actualVal = actualVal.source;
                }
                const expectedVal: any = (expected as any)[field];
                expect(actualVal, 'Field value mismatch: ' + actual.label + ":" + field + ' with prefix ' + prefix + ' ').to.eql(expectedVal);
            }
        }
    });
}

function assertExact(actualCompletions: Completion[], expectedCompletions: Partial<Completion>[], prefix: string = '') {
    expectedCompletions.forEach(expected => {
        const actualInd = actualCompletions.findIndex((comp) => comp.label === expected.label);
        const actual = actualCompletions[actualInd];
        expect(actual, 'Completion not found: ' + expected.label + ' ' + 'with prefix ' + prefix + ' ').to.not.be.equal(undefined);
        if (actual) {
            for (var field in expected) {
                let actualVal: any = (actual as any)[field];
                if (actualVal instanceof snippet) {
                    actualVal = actualVal.source;
                }
                const expectedVal: any = (expected as any)[field];
                expect(actualVal, actual.label + ":" + field).to.eql(expectedVal);
            }
            actualCompletions.splice(actualInd, 1)
        }
    });
}

function assertNotPresent(actualCompletions: Completion[], nonCompletions: Partial<Completion>[], prefix: string = '') {
    nonCompletions.forEach(notAllowed => {
        const actual = actualCompletions.find((comp) => comp.label === notAllowed.label && !!notAllowed.range &&
            comp.range.start.line === notAllowed.range.start.line &&
            comp.range.start.character === notAllowed.range.start.character &&
            comp.range.end.line === notAllowed.range.end.line &&
            comp.range.end.character === notAllowed.range.end.character
        );
        expect(actual, prefix + 'unallowed completion found: ' + notAllowed.label + ' ').to.be.equal(undefined);
    });
}


export interface Assertable {
    suggested: (expectedCompletions: Partial<Completion>[]) => void;
    exactSuggested: (expectedCompletions: Partial<Completion>[]) => void;
    notSuggested: (nonCompletions: Partial<Completion>[]) => void
}

// TODO : remove async (no need for it) and fix all breaking tests
export async function getCompletions(fileName: string, prefix: string = ''): Promise<Assertable> {
    const fullPath = path.join(CASES_PATH, fileName);
    const src: string = fs.readFileSync(fullPath).toString();

    const completions =  completionsIntenal(provider, fullPath, src, prefix);
    return {
        suggested: (expectedCompletions: Partial<Completion>[]) => {
            assertPresent(completions, expectedCompletions, prefix);
        },
        exactSuggested: (expectedCompletions: Partial<Completion>[]) => {
            assertExact(completions, expectedCompletions);
        },
        notSuggested: (expectedNoCompletions: Partial<Completion>[]) => {
            assertNotPresent(completions, expectedNoCompletions);
        }
    }
}

function completionsIntenal(provider: Provider, fileName: string, src: string, prefix: string): Completion[] {
    let pos = getCaretPosition(src);
    src = src.replace('|', prefix);
    pos.character += prefix.length;

    return provider.provideCompletionItemsFromSrc(src, pos, fileName, docsFs)
}

export function getCaretPosition(src: string) {
    const caretPos = src.indexOf('|');
    const linesTillCaret = src.substr(0, caretPos).split('\n');
    const character = linesTillCaret[linesTillCaret.length - 1].length;
    return new ProviderPosition(linesTillCaret.length - 1, character);
}

export function getPath(fileName: string): NodeBase[] {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    let pos = getCaretPosition(src);
    src = src.replace('|', "");
    const proc = createMeta(src, fullPath);
    return pathFromPosition(proc.meta!.rawAst, new ProviderPosition(pos.line + 1, pos.character))
}

export function getDefinition(fileName: string): Thenable<ProviderLocation[]> {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    let pos = getCaretPosition(src);
    src = src.replace('|', "");
    return provider.getDefinitionLocation(src, pos, fullPath, docsFs).then((res) => {
        return res;
    })
}

export function getReferences(fileName: string, pos: ProviderPosition): Location[] {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    let doc = TextDocument.create(toVscodePath(fullPath), 'stylable', 1, src)
    return provider.getRefs({ context: { includeDeclaration: true }, position: pos, textDocument: doc }, docsFs)
}

export function getSignatureHelp(fileName: string, prefix: string): SignatureHelp | null {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    let pos = getCaretPosition(src);
    src = src.replace('|', prefix);
    pos.character += prefix.length;
    return provider.getSignatureHelp(src, pos, fullPath, docsFs, ParameterInformation);
}

export function getDocumentColors(fileName: string): ColorInformation[] {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    let doc = TextDocument.create(toVscodePath(fullPath), 'stylable', 1, src)

    return resolveDocumentColors(
        stylable,
        newCssService,
        doc
    );
}

const minDocs: MinimalDocs = {
    get(uri: string): TextDocument {
        return TextDocument.create(uri, 'css', 1, fs.readFileSync(fromVscodePath(uri)).toString());
    },
    keys(): string[] {
        return fs.readdirSync(path.join(CASES_PATH, 'imports'));
    },

};
const docsFs = createDocFs(new LocalSyncFs(''), minDocs);

let openedFiles: string[] = [];
const tsLanguageServiceHost = createLanguageServiceHost({
    cwd: __dirname,
    getOpenedDocs: () => openedFiles,
    compilerOptions: {
        target: ts.ScriptTarget.ES5, sourceMap: false, declaration: true, outDir: 'dist',
        module: ts.ModuleKind.CommonJS,
        typeRoots: ["./node_modules/@types"]
    },
    defaultLibDirectory: CASES_PATH,
    baseHost: createBaseHost(docsFs, path)
});
const tsLanguageService = ts.createLanguageService(tsLanguageServiceHost);
const wrappedTs: ExtendedTsLanguageService = {
    ts: tsLanguageService,
    setOpenedFiles: (files: string[]) => openedFiles = files
};

const stylable = new Stylable('/', createFs(docsFs, true), () => ({ default: {} }));
const provider = createProvider(stylable, wrappedTs);
const newCssService = new CssService(docsFs);


//syntactic

export const customSelectorDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '@custom-selector', detail: 'Define a custom selector', sortText: 'a', insertText: '@custom-selector :--', range: rng };
}
export const extendsDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-extends:', detail: 'Extend an external component', sortText: 'a', insertText: '-st-extends: $1;', additionalCompletions: true, range: rng };
}
export const importDefaultDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-default:', detail: 'Default export name', sortText: 'a', insertText: '-st-default: $1;', range: rng };
}
export const importDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: ':import', detail: 'Import an external library', sortText: 'a', insertText: ':import {\n\t-st-from: "$1";\n}$0', range: rng }
};
export const importFromDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-from:', detail: 'Path to library', sortText: 'a', insertText: '-st-from: "$1";', range: rng };
}
export const importNamedDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-named:', detail: 'Named export name', sortText: 'a', insertText: '-st-named: $1;', range: rng };
}
export const mixinDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-mixin:', detail: 'Apply mixins on the class', sortText: 'a', insertText: '-st-mixin: $1;', range: rng };
}
export const namespaceDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '@namespace', detail: 'Declare a namespace for the file', sortText: 'a', insertText: '@namespace "$1";\n$0', range: rng };
}
export const rootClassCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '.root', detail: 'The root class', sortText: 'a', insertText: '.root', range: rng };
}
export const statesDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-states:', detail: 'Define the CSS states available for this class', sortText: 'a', insertText: '-st-states: $1;', range: rng };
}
export const themeDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-theme:', detail: 'Declare a theme', sortText: 'a', insertText: '-st-theme: true;\n$0', range: rng };
}
export const valueDirective: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: 'value()', detail: 'Use the value of a variable', sortText: 'a', insertText: ' value($1)$0', range: rng };
}
export const varsDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: ':vars', detail: 'Declare variables', sortText: 'a', insertText: ':vars {\n\t$1\n}$0', range: rng };
}
export const variantDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return { label: '-st-variant:', detail: 'Is a variant', sortText: 'a', insertText: '-st-variant: true;', range: rng };
}
export const globalCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return new Completion(':global()', 'Target a global selector', 'a', ':global($0)', rng)
}


//semantic
export const classCompletion: (className: string, rng: ProviderRange, isDefaultImport?: boolean) => Partial<Completion> = (className, rng, isDefaultImport?) => {
    return { label: (isDefaultImport ? '' : '.') + className, sortText: 'a', range: rng }
}
export const extendsCompletion: (typeName: string, rng: ProviderRange, from: string) => Partial<Completion> = (typeName, rng, from) => {
    return { label: typeName, sortText: 'a', insertText: typeName, detail: 'from: ' + from, range: rng }
}
export const namedCompletion: (typeName: string, rng: ProviderRange, from: string, value?: string) => Partial<Completion> = (typeName, rng, from, value?) => {
    return { label: typeName, sortText: 'a', insertText: typeName, detail: 'from: ' + from + '\n' + 'Value: ' + value, range: rng }
}
export const cssMixinCompletion: (symbolName: string, rng: ProviderRange, from: string) => Partial<Completion> = (symbolName, rng, from) => {
    return new Completion(symbolName, 'from: ' + from, 'a', symbolName, rng)
}
export const codeMixinCompletion: (symbolName: string, rng: ProviderRange, from: string) => Partial<Completion> = (symbolName, rng, from) => {
    return new Completion(symbolName, 'from: ' + from, 'a', symbolName + "($0)", rng, false, true)
}
export const formatterCompletion: (symbolName: string, rng: ProviderRange, from: string) => Partial<Completion> = (symbolName, rng, from) => {
    return new Completion(symbolName, 'from: ' + from, 'a', new snippet(symbolName + "($0)"), rng, false, true)
}
export const stateTypeDefinitionCompletion: (type: string, rng: ProviderRange, from?: string) => Partial<Completion> = (type, rng, from = 'Stylable pseudo-class types') => {
    return { label: `${type}()`, sortText: 'a', detail: `from: ${from}`, insertText: `${type}($0)`, range: rng }
}
export const stateValidatorDefinitionCompletion: (validator: string, rng: ProviderRange, type: string, from?: string) => Partial<Completion> = (validator, rng, type, from = `Stylable pseudo-class ${type} validators`) => {
    return { label: `${validator}()`, sortText: 'a', detail: `from: ${from}`, insertText: `${validator}($0)`, range: rng }
}
export const stateSelectorCompletion: (stateName: string, rng: ProviderRange, from?: string, hasParam?: boolean) => Partial<Completion> = (stateName, rng, from = 'Local file', hasParam = false) => {
    return { label: ':' + stateName + (hasParam ? '()' : ''), sortText: 'a', detail: 'from: ' + from, insertText: ':' + stateName + (hasParam ? '($1)$0' : ''), range: rng, triggerSignature: hasParam }
}
export const stateEnumCompletion: (option: string, rng: ProviderRange, from?: string) => Partial<Completion> = (option, rng, from = 'Local file') => {
    return { label: option, sortText: 'a', detail: 'from: ' + from, insertText: option, range: rng }
}
export const pseudoElementCompletion: (elementName: string, rng: ProviderRange, from?: string) => Partial<Completion> = (elementName, rng, from?) => {
    return { label: '::' + elementName, sortText: 'a', detail: 'from: ' + from, insertText: '::' + elementName, range: rng }
}
export const valueCompletion: (name: string, rng: ProviderRange, value: string, from: string) => Partial<Completion> = (name, rng, value, from) => {
    return { label: name, sortText: 'a', detail: 'from: ' + from + '\n' + 'value: ' + value, insertText: name, range: rng }
}
