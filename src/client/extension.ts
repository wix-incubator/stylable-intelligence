
'use strict';
import { Trace } from 'vscode-jsonrpc'
import { ExtensionContext, workspace, TextDocument, languages, ColorInformation, ColorPresentation, Color, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Executable, NotificationType } from 'vscode-languageclient';
import path = require('path');
import { DocumentColorRequest, DocumentColorParams, ColorPresentationRequest, ColorPresentationParams } from 'vscode-languageserver-protocol';

namespace OpenDocNotification {
    export const type = new NotificationType<string, void>('stylable/openDocumentNotification');
}

export function activate(context: ExtensionContext) {
 // path.join(__dirname, '..', 'server', 'server.js'); //
    let serverModule = path.join(__dirname, '..', 'server', 'server.js'); //context.asAbsolutePath(path.join('dist', 'src', 'server', 'server.js'));
    let debugOptions = { execArgv: ['--inspect'] };

    let serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions, runtime: 'node' }
    }

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ language: 'stylable' }, { language: 'typescript' }, { language: 'javascript' },],
        diagnosticCollectionName: 'stylable',
    }

    let client = new LanguageClient('stylable', serverOptions, clientOptions);
    client.trace = Trace.Verbose;


    context.subscriptions.push(client.start());

    return client
        .onReady()
        .then(_ => {
            context.subscriptions.push(languages.registerColorProvider('stylable', {
                provideDocumentColors(document: TextDocument): Thenable<ColorInformation[]> {
                    let params: DocumentColorParams = {
                        textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
                    };
                    return client.sendRequest(DocumentColorRequest.type, params).then(symbols => {
                        return symbols.map(symbol => {
                            let range = client.protocol2CodeConverter.asRange(symbol.range);
                            let color = new Color(symbol.color.red, symbol.color.green, symbol.color.blue, symbol.color.alpha);
                            return new ColorInformation(range, color);
                        });
                    });
                },
                provideColorPresentations(color: Color, context): ColorPresentation[] | Thenable<ColorPresentation[]> {
                    let params: ColorPresentationParams = {
                        textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(context.document),
                        color,
                        range: client.code2ProtocolConverter.asRange(context.range)
                    };
                    return client.sendRequest(ColorPresentationRequest.type, params).then(presentations => {
                        return presentations.map(p => {
                            let presentation = new ColorPresentation(p.label);
                            presentation.textEdit = p.textEdit && client.protocol2CodeConverter.asTextEdit(p.textEdit);
                            presentation.additionalTextEdits = p.additionalTextEdits && client.protocol2CodeConverter.asTextEdits(p.additionalTextEdits);
                            return presentation;
                        });
                    });
                }
            }));
        })
        .then(() => workspace.findFiles('**/*.st.css', ))
        .then((files: any) => Promise.all(files.map((file: any) => workspace.openTextDocument(file.fsPath))))
        .then(() => client.onNotification(OpenDocNotification.type, (uri: string) => workspace.openTextDocument(Uri.parse(uri)).then((doc) => {
            if (doc.fileName.endsWith('.js')) {
                workspace.findFiles('**/' + path.basename(doc.fileName).slice(0, -3) + '.d.ts').then((uris) => {
                    uris.forEach(u => {
                        workspace.openTextDocument(u);
                    })
                })
            }
        })))
        .then(() => client)
}

