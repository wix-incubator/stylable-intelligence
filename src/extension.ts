'use strict';
import {Trace} from 'vscode-jsonrpc'
import {
    Color,
    ColorInformation,
    ColorPresentation,
    ExtensionContext,
    languages,
    TextDocument,
    Uri,
    workspace
} from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    NotificationType,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient';
import {
    ColorPresentationParams,
    ColorPresentationRequest,
    DocumentColorParams,
    DocumentColorRequest
} from 'vscode-languageserver-protocol';
import path = require('path');

namespace OpenDocNotification {
    export const type = new NotificationType<string, void>('stylable/openDocumentNotification');
}

/**
 * vs-code plugin API implementation
 * this is the main entry point for the vs studio code extension API
 * see https://code.visualstudio.com/docs/extensionAPI/activation-events
 */
export async function activate(context: ExtensionContext) {
    let serverModule = require.resolve('./lib/server.js'); //context.asAbsolutePath(path.join('dist', 'src', 'server', 'server.js'));
    let debugOptions = {execArgv: ['--inspect']};

    let serverOptions: ServerOptions = {
        run: {module: serverModule, transport: TransportKind.ipc},
        debug: {module: serverModule, transport: TransportKind.ipc, options: debugOptions, runtime: 'node'}
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{language: 'stylable'}, {language: 'typescript'}, {language: 'javascript'},],
        diagnosticCollectionName: 'stylable',
    };

    const client = new LanguageClient('stylable', serverOptions, clientOptions);
    client.trace = Trace.Verbose;

    context.subscriptions.push(client.start());
    await client.onReady();
    const disposeColorProvider = languages.registerColorProvider('stylable', {
        async provideDocumentColors(document: TextDocument): Promise<ColorInformation[]> {
            let params: DocumentColorParams = {
                textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
            };
            const symbols = await client.sendRequest(DocumentColorRequest.type, params);
            return symbols.map(symbol => {
                let range = client.protocol2CodeConverter.asRange(symbol.range);
                let color = new Color(symbol.color.red, symbol.color.green, symbol.color.blue, symbol.color.alpha);
                return new ColorInformation(range, color);
            });
        },
        async provideColorPresentations(color: Color, context): Promise<ColorPresentation[]> {
            let params: ColorPresentationParams = {
                textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(context.document),
                color,
                range: client.code2ProtocolConverter.asRange(context.range)
            };
            const presentations = await client.sendRequest(ColorPresentationRequest.type, params);
            return presentations.map(p => {
                let presentation = new ColorPresentation(p.label);
                presentation.textEdit = p.textEdit && client.protocol2CodeConverter.asTextEdit(p.textEdit);
                presentation.additionalTextEdits = p.additionalTextEdits && client.protocol2CodeConverter.asTextEdits(p.additionalTextEdits);
                return presentation;
            });
        }
    });
    context.subscriptions.push(disposeColorProvider);
    const files = await workspace.findFiles('**/*.st.css');
    await Promise.all(files.map((file: any) => workspace.openTextDocument(file.fsPath)));
    client.onNotification(OpenDocNotification.type, async (uri: string) => {
        const doc = await workspace.openTextDocument(Uri.parse(uri));
        if (doc.fileName.endsWith('.js')) {
            const uris = await workspace.findFiles('**/' + path.basename(doc.fileName).slice(0, -3) + '.d.ts');
            uris.forEach(u => {
                workspace.openTextDocument(u);
            });
        }
    });
    return client;
}

/**
 * vs-code plugin API implementation
 * deactivation cleanup
 */
export async function deactivate() {

}
