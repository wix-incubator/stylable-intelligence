import { Diagnostic, Range } from 'vscode-languageserver-types';
import { toVscodePath } from '../../src/lib/utils/uri-utils';

export function createDiagnosisNotification(diagnostics: Diagnostic[], fileName: string) {
    return {
        diagnostics,
        uri: toVscodePath('/' + fileName)
    };
}

export function createExpectedDiagnosis(
    range: Range,
    message: string,
    source: string = 'stylable',
    code?: string
): Diagnostic {
    return Diagnostic.create(range, message, 2, code, source);
}

export function trimLiteral(content: TemplateStringsArray, ...keys: string[]) {
    if (keys.length) {
        throw new Error('No support for expressions in pipe-delimited test files yet');
    }
    return content
        .join('\n')
        .replace(/^\s*\|/gm, '')
        .replace(/^\n/, '');
}
