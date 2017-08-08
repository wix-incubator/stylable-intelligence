import StylableDotCompletionProvider, { Completion, snippet, ExtendedResolver, ProviderPosition, ProviderRange } from '../src/provider'
import { Resolver, Stylesheet } from 'stylable'
import * as _ from 'lodash';
import { expect } from "chai";
import { TestResolver } from '../test-kit/test-resolver';

const provider = new StylableDotCompletionProvider();

function assertCompletions(actualCompletions: Completion[], expectedCompletions: Partial<Completion>[], prefix: string = '') {
    expectedCompletions.forEach(expected => {
        const actual = actualCompletions.find((comp) => comp.label === expected.label);
        expect(actual, prefix + 'completion not found: ' + expected.label + ' ').to.not.be.equal(undefined);
        if (actual) {
            for (var field in expected) {
                let actualVal: any = (actual as any)[field];
                if (actualVal instanceof snippet) {
                    actualVal = actualVal.source;
                }
                const expectedVal: any = (expected as any)[field];
                expect(actualVal, actual.label + ":" + field).to.equal(expectedVal);
            }
        }
    });
}

function assertNoCompletions(actualCompletions: Completion[], nonCompletions: Partial<Completion>[], prefix: string = '') {
    nonCompletions.forEach(notAllowed => {
        const actual = actualCompletions.find((comp) => comp.label === notAllowed.label);
        expect(actual, prefix + 'unallowed completion found: ' + notAllowed.label + ' ').to.be.equal(undefined);

    });
}


export interface assertable {
    suggested: (expectedCompletions: Partial<Completion>[]) => void;
    notSuggested: (nonCompletions: Partial<Completion>[]) => void
}

export function getCompletions(src: string, extrafiles: { [path: string]: string } = {}, checkSingleLine: boolean = false): Thenable<assertable> {
    const singleLineSrc = src.split('\n').join('');
    let normalCompletions: Completion[];
    return completionsIntenal(src, extrafiles)
        .then((completions) => { normalCompletions = completions; })
        .then<Completion[] | null>(() => checkSingleLine ? completionsIntenal(singleLineSrc, extrafiles) : Promise.resolve(null))
        .then((singleLineCompletions) => {
            return {
                suggested: (expectedNoCompletions: Partial<Completion>[]) => {
                    assertCompletions(normalCompletions, expectedNoCompletions);
                    singleLineCompletions && assertCompletions(singleLineCompletions, expectedNoCompletions, 'single line: ');
                },
                notSuggested: (expectedNoCompletions: Partial<Completion>[]) => {
                    assertNoCompletions(normalCompletions, expectedNoCompletions);
                    singleLineCompletions && assertNoCompletions(singleLineCompletions, expectedNoCompletions, 'single line: ');
                }
            }

        })
}

function completionsIntenal(src: string, extrafiles: { [path: string]: string } = {}): Thenable<Completion[]> {
    const caretPos = src.indexOf('|');
    const linesTillCaret = src.substr(0, caretPos).split('\n');
    const character = linesTillCaret[linesTillCaret.length - 1].length;

    src = src.replace('|', "");

    const resolver = new TestResolver({});
    resolver.addExtraFiles(extrafiles);

    return provider.provideCompletionItemsFromSrc(src, {
        line: linesTillCaret.length - 1,
        character
    }, 'projectRoot/main.css', resolver)
}

export const importCompletion: Partial<Completion> = { label: ':import', detail: 'Import an external library', sortText: 'a', insertText: ':import {\n\t-st-from: "$1";\n}' };
export const rootCompletion: Partial<Completion> = { label: '.root', detail: 'The root class', sortText: 'b', insertText: '.root' };
export const statesDirectiveCompletion: Partial<Completion> = { label: '-st-states:', detail: 'Define the CSS states available for this class', sortText: 'a', insertText: '-st-states: $1;' };
export const extendsDirectiveCompletion: Partial<Completion> = { label: '-st-extends:', detail: 'Extend an external component', sortText: 'a', insertText: '-st-extends: $1;', additionalCompletions: true };
export const mixinDirectiveCompletion: Partial<Completion> = { label: '-st-mixin:', detail: 'Apply mixins on the class', sortText: 'a', insertText: '-st-mixin: $1;' };
export const variantDirectiveCompletion: Partial<Completion> = { label: '-st-variant:', detail: '', sortText: 'a', insertText: '-st-variant: true;' };
export const importFromDirectiveCompletion: Partial<Completion> = { label: '-st-from:', detail: 'Path to library', sortText: 'a', insertText: '-st-from: "$1";' };
export const importDefaultDirectiveCompletion: Partial<Completion> = { label: '-st-default:', detail: 'Default object export name', sortText: 'a', insertText: '-st-default: $1;' };
export const importNamedDirectiveCompletion: Partial<Completion> = { label: '-st-named:', detail: 'Named object export name', sortText: 'a', insertText: '-st-named: $1;' };
export const filePathCompletion: (filePath: string) => Partial<Completion> = (filePath) => { return { label: filePath, sortText: 'a', insertText: './' + filePath } };
export const classCompletion: (className: string) => Partial<Completion> = (className) => { return { label: '.' + className, sortText: 'b' } }
export const stateCompletion: (stateName: string, from?: string) => Partial<Completion> = (stateName, from = 'projectRoot/main.css') => { return { label: ':' + stateName, sortText: 'a', detail: 'from: ' + from, insertText: ':' + stateName } }
export const extendsCompletion: (typeName: string, range?: ProviderRange) => Partial<Completion> = (typeName, range) => { return { label: typeName, sortText: 'a', insertText: ' ' + typeName + ';\n', range } };
