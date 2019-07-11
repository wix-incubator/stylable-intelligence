import fs from '@file-services/node';
import { TextDocuments } from 'vscode-languageserver';
import { StylableLanguageService } from '../src/lib/service';

export const CASES_PATH = fs.join(
    fs.dirname(fs.findClosestFileSync(__dirname, 'package.json')!),
    'fixtures',
    'server-cases'
);

export const stylableLSP = new StylableLanguageService({
    rootPath: CASES_PATH,
    fs,
    textDocuments: new TextDocuments(),
    requireModule: (request: string) => {
        return require(require.resolve(request, { paths: [CASES_PATH] }));
    }
});
