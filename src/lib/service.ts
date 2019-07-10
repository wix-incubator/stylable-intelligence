import path from 'path';
import { CompletionParams } from 'vscode-languageclient';
import {
    Definition,
    Hover,
    ReferenceParams,
    SignatureHelp,
    TextDocumentPositionParams,
    WorkspaceEdit,
    DocumentColorParams,
    ColorPresentationParams,
    RenameParams
} from 'vscode-languageserver-protocol';
import { IConnection, TextDocuments } from 'vscode-languageserver';
import {
    Command,
    CompletionItem,
    Location,
    ParameterInformation,
    TextEdit,
    Diagnostic,
    Position,
    TextDocument
} from 'vscode-languageserver-types';
import { Stylable } from '@stylable/core';
import { IFileSystem, ReadFileOptions, IBaseFileSystemSyncActions } from '@file-services/types';
import { URI } from 'vscode-uri';

import { Provider } from './provider';

import { ProviderPosition, ProviderRange } from './completion-providers';
import { Completion } from './completion-types';
import { createDiagnosis } from './diagnosis';
import { getRefs, getRenameRefs } from './provider';
import { ExtendedTsLanguageService } from './types';
import { CssService } from '../model/css-service';
import { resolveDocumentColors, getColorPresentation } from './feature/color-provider';
import { dedupeRefs } from './dedupe-refs';
import { typescriptSupport } from './typescript-support';

interface Config {
    rootPath: string;
    fs: IFileSystem;
    requireModule: (request: string) => any;
    textDocuments: TextDocuments;
}

function wrapFs(fs: IFileSystem, docs: TextDocuments): IFileSystem {
    const readFileSync = ((path: string, ...args: [ReadFileOptions]) => {
        const file = docs.get(URI.file(path).toString());

        return file ? file.getText() : fs.readFileSync(path, ...args);
    }) as IBaseFileSystemSyncActions['readFileSync'];

    return { ...fs, readFileSync };
}

export class StylableLanguageService {
    private docsDispatcher: TextDocuments;
    private tsLanguageService: ExtendedTsLanguageService;
    private stylable: Stylable;
    private requireModule: (request: string) => any;
    private provider: Provider;
    private cssService: CssService;
    private fs: IFileSystem;

    constructor({ rootPath, fs, requireModule, textDocuments }: Config) {
        this.docsDispatcher = textDocuments;
        this.fs = wrapFs(fs, this.docsDispatcher);

        this.tsLanguageService = typescriptSupport(this.fs);
        this.stylable = new Stylable(rootPath, this.fs as any, requireModule);
        this.requireModule = requireModule;
        this.provider = new Provider(this.stylable, this.tsLanguageService);
        this.cssService = new CssService(this.fs);
    }

    public getDocsDispatcher() {
        return this.docsDispatcher;
    }

    public getStylable() {
        return this.stylable;
    }

    public getFs() {
        return this.fs;
    }

    public provideCompletionItemsFromSrc(src: string, pos: Position, fileName: string) {
        return this.provider.provideCompletionItemsFromSrc(src, pos, fileName, this.fs);
    }

    public getDefinitionLocation(src: string, position: ProviderPosition, filePath: string) {
        return this.provider.getDefinitionLocation(src, position, filePath, this.fs);
    }

    public getSignatureHelp(src: string, pos: Position, filePath: string, paramInfo: typeof ParameterInformation) {
        return this.provider.getSignatureHelp(src, pos, filePath, this.fs, paramInfo);
    }

    public getRefs(filePath: string, position: ProviderPosition) {
        return getRefs(filePath, position, this.fs, this.stylable);
    }

    public resolveDocumentColors(document: TextDocument) {
        return resolveDocumentColors(this.stylable, this.cssService, document);
    }

    public getColorPresentation(document: TextDocument, params: ColorPresentationParams) {
        return getColorPresentation(this.cssService, document, params);
    }

    public diagnose(connection: IConnection) {
        const diagnoseConfig = {
            connection,
            requireModule: this.requireModule,
            cssService: this.cssService,
            docsDispatcher: this.docsDispatcher,
            stylable: this.stylable
        };

        return () => diagnose(diagnoseConfig);
    }

    public onCompletion(params: CompletionParams): CompletionItem[] {
        const documentUri = params.textDocument.uri;
        const position = params.position;

        if (!documentUri.endsWith('.st.css') && !documentUri.startsWith('untitled:')) {
            return [];
        }

        const document = this.docsDispatcher.get(documentUri);

        if (document) {
            const res = this.provider.provideCompletionItemsFromSrc(
                document.getText(),
                {
                    line: position.line,
                    character: position.character
                },
                URI.parse(documentUri).fsPath,
                this.fs
            );

            return res
                .map((com: Completion) => {
                    const lspCompletion: CompletionItem = CompletionItem.create(com.label);
                    const ted: TextEdit = TextEdit.replace(
                        com.range
                            ? com.range
                            : new ProviderRange(
                                  new ProviderPosition(position.line, Math.max(position.character - 1, 0)),
                                  position
                              ),
                        typeof com.insertText === 'string' ? com.insertText : com.insertText.source
                    );
                    lspCompletion.insertTextFormat = 2;
                    lspCompletion.detail = com.detail;
                    lspCompletion.textEdit = ted;
                    lspCompletion.sortText = com.sortText;
                    lspCompletion.filterText =
                        typeof com.insertText === 'string' ? com.insertText : com.insertText.source;
                    if (com.additionalCompletions) {
                        lspCompletion.command = Command.create('additional', 'editor.action.triggerSuggest');
                    } else if (com.triggerSignature) {
                        lspCompletion.command = Command.create('additional', 'editor.action.triggerParameterHints');
                    }
                    return lspCompletion;
                })
                .concat(this.cssService.getCompletions(document, position));
        } else {
            return [];
        }
    }

    public async onDefinition(params: TextDocumentPositionParams): Promise<Definition> {
        const documentUri = params.textDocument.uri;
        const docPath = URI.parse(documentUri).fsPath;

        if (!documentUri.endsWith('.st.css') && !documentUri.startsWith('untitled:')) {
            return [];
        }

        const fileContent = this.fs.readFileSync(docPath, 'utf8');
        const pos = params.position;

        const res = await this.provider.getDefinitionLocation(
            fileContent,
            {
                line: pos.line,
                character: pos.character
            },
            docPath,
            this.fs
        );

        return res.map(loc => Location.create(URI.file(loc.uri).toString(), loc.range));
    }

    public onHover(params: TextDocumentPositionParams): Hover | null {
        const doc = this.docsDispatcher.get(params.textDocument.uri);

        return doc && doc.uri.endsWith('.st.css') ? this.cssService.doHover(doc, params.position) : null;
    }

    public onReferences(params: ReferenceParams): Location[] {
        const u = URI.parse(params.textDocument.uri);

        if (!u.path.endsWith('.st.css') && !u.path.startsWith('untitled:')) {
            return [];
        }

        const refs = this.getRefs(u.fsPath, params.position);

        if (refs.length) {
            return dedupeRefs(refs);
        } else {
            const doc = this.docsDispatcher.get(params.textDocument.uri);
            return doc ? dedupeRefs(this.cssService.findReferences(doc, params.position)) : [];
        }
    }

    public onDocumentColor(params: DocumentColorParams) {
        const documentUri = params.textDocument.uri;

        if (!documentUri.endsWith('.st.css') && !documentUri.startsWith('untitled:')) {
            return [];
        }

        const doc = this.docsDispatcher.get(params.textDocument.uri);
        return doc ? resolveDocumentColors(this.stylable, this.cssService, doc) : [];
    }

    public onColorPresentation(params: ColorPresentationParams) {
        const documentUri = params.textDocument.uri;

        if (!documentUri.endsWith('.st.css') && !documentUri.startsWith('untitled:')) {
            return [];
        }

        const doc = this.docsDispatcher.get(params.textDocument.uri);
        return doc ? getColorPresentation(this.cssService, doc, params) : [];
    }

    public onRenameRequest(params: RenameParams): WorkspaceEdit {
        const documentUri = params.textDocument.uri;

        if (!documentUri.endsWith('.st.css') && !documentUri.startsWith('untitled:')) {
            return { changes: {} };
        }

        const edit: WorkspaceEdit = { changes: {} };
        getRenameRefs(URI.parse(params.textDocument.uri).fsPath, params.position, this.fs, this.stylable).forEach(
            ref => {
                if (edit.changes![ref.uri]) {
                    edit.changes![ref.uri].push({ range: ref.range, newText: params.newName });
                } else {
                    edit.changes![ref.uri] = [{ range: ref.range, newText: params.newName }];
                }
            }
        );

        return edit;
    }

    public onSignatureHelp(params: TextDocumentPositionParams): Thenable<SignatureHelp> | null {
        const documentPath = URI.parse(params.textDocument.uri).fsPath;

        if (!documentPath.endsWith('.st.css') && !documentPath.startsWith('untitled:')) {
            return null;
        }

        const doc: string = this.fs.readFileSync(params.textDocument.uri, 'utf8');

        const sig = this.provider.getSignatureHelp(
            doc,
            params.position,
            documentPath,
            this.fs,
            ParameterInformation
        );
        return Promise.resolve(sig!);
    }

    public onDocumentFormatting() {
        // no op
        return null;
    }
}

interface DiagConfig {
    connection: IConnection;
    docsDispatcher: TextDocuments;
    stylable: Stylable;
    cssService: CssService;
}

async function diagnose({ connection, docsDispatcher, stylable, cssService }: DiagConfig) {
    let res: any;
    let ignore = false;
    try {
        res = await connection.workspace.getConfiguration({
            section: 'stylable'
        });
        if (!!res && !!res.diagnostics && !!res.diagnostics.ignore && !!res.diagnostics.ignore.length) {
            ignore = true;
        }
    } catch (e) {
        /*Client has no workspace/configuration method, ignore silently */
    }

    const result: Diagnostic[] = [];
    docsDispatcher.keys().forEach(key => {
        const doc = docsDispatcher.get(key);
        if (!!doc) {
            if (doc.languageId === 'stylable') {
                let diagnostics: Diagnostic[];
                if (
                    ignore &&
                    (res.diagnostics.ignore as string[]).some(p => {
                        return URI.parse(doc.uri).path.startsWith(path.resolve(p));
                    })
                ) {
                    diagnostics = [];
                } else {
                    diagnostics = createDiagnosis(doc.getText(), doc.uri, stylable)
                        .map(diag => {
                            diag.source = 'stylable';
                            return diag;
                        })
                        .concat(cssService.getDiagnostics(doc));
                    result.push(...diagnostics);
                }
                connection.sendDiagnostics({ uri: doc.uri, diagnostics });
            }
        }
    });

    return result;
}
