import path from 'path';
import { IFileSystem } from '@file-services/types';
import { Stylable } from '@stylable/core';
import { lspFormattingOptionsToJsBeautifyOptions, StylableLanguageService } from '@stylable/language-service';
import {
    ColorInformation,
    ColorPresentation,
    ColorPresentationParams,
    CompletionParams,
    CompletionItem,
    Definition,
    Diagnostic,
    DocumentColorParams,
    Hover,
    Connection,
    Location,
    TextEdit,
    TextDocumentChangeEvent,
    TextDocumentPositionParams,
    TextDocuments,
    ReferenceParams,
    RenameParams,
    SignatureHelp,
    WorkspaceEdit,
    DocumentFormattingParams,
    DocumentRangeFormattingParams,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { normalizeConfig, VSCodeStylableExtensionConfig } from './normalize-config';
import type { CSSBeautifyOptions } from 'js-beautify';

export interface ExtensionConfiguration {
    diagnostics: {
        ignore: string[];
    };
    formatting: CSSBeautifyOptions;
}

export class VSCodeStylableLanguageService {
    public textDocuments: TextDocuments<TextDocument>;
    public languageService: StylableLanguageService;
    private connection: Connection;
    private clientConfig: ExtensionConfiguration = { diagnostics: { ignore: [] }, formatting: {} };

    constructor(connection: Connection, docs: TextDocuments<TextDocument>, fs: IFileSystem, stylable: Stylable) {
        this.languageService = new StylableLanguageService({
            fs,
            stylable,
        });
        this.textDocuments = docs;
        this.connection = connection;
    }

    public onCompletion({ textDocument, position }: CompletionParams): CompletionItem[] {
        const { fsPath, doc } = this.getDocAndPath(textDocument.uri);
        return doc ? this.languageService.onCompletion(fsPath, doc.offsetAt(position)) : [];
    }

    public onDefinition({ textDocument, position }: TextDocumentPositionParams): Definition {
        const { fsPath, doc } = this.getDocAndPath(textDocument.uri);
        return doc ? this.languageService.onDefinition(fsPath, doc.offsetAt(position)) : [];
    }

    public onHover({ textDocument, position }: TextDocumentPositionParams): Hover | null {
        const { fsPath, doc } = this.getDocAndPath(textDocument.uri);
        return doc ? this.languageService.onHover(fsPath, doc.offsetAt(position)) : null;
    }

    public onReferences({ textDocument, position }: ReferenceParams): Location[] {
        const { fsPath, doc } = this.getDocAndPath(textDocument.uri);
        return doc ? this.languageService.onReferences(fsPath, doc.offsetAt(position)) : [];
    }

    public onRenameRequest({ textDocument, position, newName }: RenameParams): WorkspaceEdit {
        const { fsPath, doc } = this.getDocAndPath(textDocument.uri);
        return doc ? this.languageService.onRenameRequest(fsPath, doc.offsetAt(position), newName) : {};
    }

    public onSignatureHelp({ textDocument, position }: TextDocumentPositionParams): SignatureHelp | null {
        const { fsPath, doc } = this.getDocAndPath(textDocument.uri);
        return doc ? this.languageService.onSignatureHelp(fsPath, doc.offsetAt(position)) : null;
    }

    public onDocumentColor({ textDocument }: DocumentColorParams): ColorInformation[] {
        const { fsPath } = URI.parse(textDocument.uri);
        return this.languageService.onDocumentColor(fsPath);
    }

    public onColorPresentation({ color, textDocument, range }: ColorPresentationParams): ColorPresentation[] {
        const { fsPath, doc } = this.getDocAndPath(textDocument.uri);

        return doc
            ? this.languageService.onColorPresentation(
                  fsPath,
                  { start: doc.offsetAt(range.start), end: doc.offsetAt(range.end) },
                  color
              )
            : [];
    }

    public onDocumentFormatting({ textDocument, options }: DocumentFormattingParams): TextEdit[] {
        const { doc } = this.getDocAndPath(textDocument.uri);

        if (doc) {
            return this.languageService.getDocumentFormatting(
                doc,
                { start: 0, end: doc.getText().length },
                { ...lspFormattingOptionsToJsBeautifyOptions(options), ...this.clientConfig.formatting }
            );
        }

        return [];
    }

    public onDocumentRangeFormatting({ textDocument, range, options }: DocumentRangeFormattingParams): TextEdit[] {
        const { doc } = this.getDocAndPath(textDocument.uri);

        if (doc) {
            return this.languageService.getDocumentFormatting(
                doc,
                { start: doc.offsetAt(range.start), end: doc.offsetAt(range.end) },
                { ...lspFormattingOptionsToJsBeautifyOptions(options), ...this.clientConfig.formatting }
            );
        }

        return [];
    }

    public diagnoseWithVsCodeConfig(): Diagnostic[] {
        const result: Diagnostic[] = [];
        this.textDocuments.keys().forEach((key) => {
            const doc = this.textDocuments.get(key);
            if (doc) {
                if (doc.languageId === 'stylable') {
                    const uri = URI.parse(doc.uri);
                    // on windows, uri.fsPath replaces separators with '\'
                    // this breaks posix paths in-memory when running on windows
                    // take raw posix path instead
                    const fsPath =
                        uri.scheme === 'file' &&
                        !uri.authority && // not UNC
                        uri.path.charCodeAt(2) !== 58 && // the colon in "c:"
                        path.isAbsolute(uri.path)
                            ? uri.path
                            : uri.fsPath;
                    let diagnostics: Diagnostic[];
                    if (
                        this.clientConfig.diagnostics.ignore.some((p) => {
                            return fsPath.startsWith(p);
                        })
                    ) {
                        diagnostics = [];
                    } else {
                        diagnostics = this.languageService.diagnose(fsPath);
                        result.push(...diagnostics);
                    }
                    this.connection.sendDiagnostics({ uri: doc.uri, diagnostics });
                }
            }
        });

        return result;
    }

    public async onChangeConfig(): Promise<void> {
        await this.loadClientConfiguration();
        this.diagnoseWithVsCodeConfig();
    }

    public onDidClose(event: TextDocumentChangeEvent<TextDocument>): void {
        this.connection.sendDiagnostics({
            diagnostics: [],
            uri: event.document.uri,
        });
    }

    public async loadClientConfiguration(): Promise<void> {
        try {
            const res = (await this.connection.workspace.getConfiguration({
                section: 'stylable',
            })) as VSCodeStylableExtensionConfig;

            this.clientConfig = normalizeConfig(res);
        } catch (e) {
            /*Client has no workspace/configuration method, ignore silently */
        }
    }

    private getDocAndPath(uri: string) {
        const { fsPath } = URI.parse(uri);
        const doc = this.textDocuments.get(uri);

        return { fsPath, doc };
    }
}
