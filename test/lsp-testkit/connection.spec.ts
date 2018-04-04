// significant portions of this file were originally copied from Microsoft's vscode-languageserver-node sources
// at commit 059dc8612d9cb72ec86c69beba3839ce02febfd9
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ------------------------------------------------------------------------------------------ */

import {Duplex} from 'stream';

import {CompletionParams, createConnection, IConnection, InitializeResult} from "vscode-languageserver";
import {expect, plan, obj} from "../testkit/chai.spec";
import {
    CompletionItem,
    CompletionList,
    CompletionRequest,
    Definition,
    DefinitionRequest,
    DidChangeConfigurationNotification,
    DidChangeConfigurationParams,
    DidChangeTextDocumentNotification,
    DidChangeTextDocumentParams,
    DidChangeWatchedFilesNotification,
    DidChangeWatchedFilesParams,
    DidCloseTextDocumentNotification,
    DidCloseTextDocumentParams,
    DidOpenTextDocumentNotification,
    DidOpenTextDocumentParams,
    DidSaveTextDocumentNotification,
    DidSaveTextDocumentParams,
    ErrorCodes,
    ExitNotification,
    Hover,
    HoverRequest,
    InitializeParams,
    InitializeRequest,
    Location,
    LogMessageNotification,
    LogMessageParams,
    NotificationHandler,
    PublishDiagnosticsNotification,
    PublishDiagnosticsParams,
    ReferenceParams,
    ReferencesRequest,
    RequestType,
    ShowMessageNotification,
    ShowMessageParams,
    ShutdownRequest,
    SignatureHelp,
    SignatureHelpRequest,
    TelemetryEventNotification,
    TextDocumentPositionParams, WorkspaceEdit, RenameRequest, RenameParams
} from 'vscode-languageserver-protocol';

class TestDuplex extends Duplex {
    constructor(private name: string = 'ds1', private dbg = false) {
        super();
    }

    _write(chunk: string | Buffer, _encoding: string, done: Function) {
        if (this.dbg) console.log(this.name + ': write: ' + chunk.toString());
        setImmediate(() => {
            this.emit('data', chunk);
        });
        done();
    }

    _read(_size: number) {

    }
}

// adapted from https://github.com/Microsoft/vscode-languageserver-node/blob/master/client/src/client.ts
export class StreamConnectionClient {
    private readonly connection: IConnection;

    // 'inherited' method
    sendRequest: IConnection['sendRequest'];
    onRequest: IConnection['onRequest'];
    sendNotification: IConnection['sendNotification'];
    onNotification: IConnection['onNotification'];
    listen: IConnection['listen'];
    dispose: IConnection['dispose'];

    constructor(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
        this.connection = createConnection(input, output);
        this.sendRequest = this.connection.sendRequest.bind(this.connection);
        this.onRequest = this.connection.onRequest.bind(this.connection);
        this.sendNotification = this.connection.sendNotification.bind(this.connection);
        this.onNotification = this.connection.onNotification.bind(this.connection);
        this.listen = this.connection.listen.bind(this.connection);
        this.dispose = this.connection.dispose.bind(this.connection);
    }

    // extend
    async initialize(params: InitializeParams = {} as any): Promise<InitializeResult> {
        if (!params.capabilities) {
            params.capabilities = {};
        }
        return await this.connection.sendRequest(InitializeRequest.type, params);
    }

    async shutdown() {
        return await this.connection.sendRequest(ShutdownRequest.type, undefined);
    }

    exit() {
        return this.connection.sendNotification(ExitNotification.type);
    }

    onLogMessage(handler: NotificationHandler<LogMessageParams>) {
        return this.connection.onNotification(LogMessageNotification.type, handler);
    }

    onShowMessage(handler: NotificationHandler<ShowMessageParams>) {
        return this.connection.onNotification(ShowMessageNotification.type, handler);
    }

    onTelemetry(handler: NotificationHandler<any>) {
        return this.connection.onNotification(TelemetryEventNotification.type, handler);
    }

    didChangeConfiguration(params: DidChangeConfigurationParams) {
        return this.connection.sendNotification(DidChangeConfigurationNotification.type, params);
    }

    didChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
        return this.connection.sendNotification(DidChangeWatchedFilesNotification.type, params);
    }

    didOpenTextDocument(params: DidOpenTextDocumentParams) {
        return this.connection.sendNotification(DidOpenTextDocumentNotification.type, params);
    }

    didChangeTextDocument(params: DidChangeTextDocumentParams) {
        return this.connection.sendNotification(DidChangeTextDocumentNotification.type, params);
    }

    didCloseTextDocument(params: DidCloseTextDocumentParams) {
        return this.connection.sendNotification(DidCloseTextDocumentNotification.type, params);
    }

    didSaveTextDocument(params: DidSaveTextDocumentParams) {
        return this.connection.sendNotification(DidSaveTextDocumentNotification.type, params);
    }

    onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
        return this.connection.onNotification(PublishDiagnosticsNotification.type, handler);
    }

    async completion(params: CompletionParams): Promise<CompletionList | CompletionItem[] | null> {
        return await this.connection.sendRequest(CompletionRequest.type, params);
    }

    async hover(params: TextDocumentPositionParams): Promise<Hover | null> {
        return await this.connection.sendRequest(HoverRequest.type, params);
    }

    async signatureHelp(params: TextDocumentPositionParams): Promise<SignatureHelp | null> {
        return await this.connection.sendRequest(SignatureHelpRequest.type, params);
    }

    async definition(params: TextDocumentPositionParams): Promise<Definition> {
        return await this.connection.sendRequest(DefinitionRequest.type, params);
    }

    async references(params: ReferenceParams): Promise<Location[] | null> {
        return await this.connection.sendRequest(ReferencesRequest.type, params);
    }

    async rename(params: RenameParams): Promise<WorkspaceEdit | null> {
        return await this.connection.sendRequest(RenameRequest.type, params);
    }

    // async documentColor(params: TextDocumentPositionParams): Promise< ColorInformation[]> {
    //     return await this.connection.sendRequest(DocumentColorRequest.type, params);
    // }
    // async colorPresentation(params: TextDocumentPositionParams): Promise<ColorPresentation[]> {
    //     return await this.connection.sendRequest(ColorPresentationRequest.type, params);
    // }
}

export class TestConnection {
    private duplexStream1 = new TestDuplex('ds1');
    private duplexStream2 = new TestDuplex('ds2');

    public server: IConnection = createConnection(this.duplexStream2, this.duplexStream1);
    public client = new StreamConnectionClient(this.duplexStream1, this.duplexStream2);

    public listen() {
        this.server.listen();
        this.client.listen();
    }

    // public dispose() {
    //     this.server.dispose();
    //     this.client.dispose();
    // }
}

// adapted from https://github.com/Microsoft/vscode-languageserver-node/blob/master/jsonrpc/src/test/connection.test.ts

describe("LSP connection test driver", function () {

    it('Test Duplex Stream', plan(1, () => {
        let stream = new TestDuplex('ds1');
        stream.on('data', (chunk) => {
            expect(chunk.toString()).to.eql('Hello World');
        });
        stream.write('Hello World');
    }));

    it('Test Duplex Stream Connection', plan(1, () => {
        const type = new RequestType<string, string, void, void>('test/foo');
        const inputStream = new TestDuplex('ds1');
        const outputStream = new TestDuplex('ds2');
        let connection: IConnection = createConnection(inputStream, outputStream);
        connection.listen();
        let content: string = "";
        outputStream.on('data', (chunk) => {
            content += chunk.toString();
            const match = content.match(/Content-Length:\s*(\d+)\s*/);
            if (match) {
                const contentLength = Number(match[1]);
                if (content.length === match[0].length + contentLength) {
                    const message = JSON.parse(content.substr(contentLength * -1));
                    expect(message).to.contain({
                        "method": "test/foo",
                        "params": "bar"
                    });
                }
            }
        });
        connection.sendRequest(type, 'bar');
    }));

    describe("TestConnection", function () {
        let testCon: TestConnection;
        beforeEach(() => {
            testCon = new TestConnection();
            testCon.listen();
        });
        describe("onRequest", function () {
            const testRequest = new RequestType<string, string, void, void>('test/foo');
            it('Handle Single Request', plan(2, async () => {
                testCon.server.onRequest(testRequest, (p1) => {
                    expect(p1).to.equal('argument');
                    return 'result';
                });
                const result = await testCon.client.sendRequest(testRequest, 'argument');
                expect(result).to.equal('result');
            }));

            it('Handle Multiple Requests', plan(1, async () => {
                testCon.server.onRequest(testRequest, (p1) => {
                    return p1 + '1';
                });
                let promises: Thenable<string>[] = [];
                promises.push(testCon.client.sendRequest(testRequest, 'foo'));
                promises.push(testCon.client.sendRequest(testRequest, 'bar'));

                const values = await Promise.all(promises);
                expect(values).to.eql(['foo1', 'bar1']);
            }));

            it('Unhandled Request', plan(1, async () => {
                try {
                    await testCon.client.sendRequest(testRequest, 'foo');
                } catch (error) {
                    expect(error.code).to.eql(ErrorCodes.MethodNotFound);
                }
            }));
        });
        describe("connection client", function () {

            function testRequestFromClient(clientMethod: keyof StreamConnectionClient, serverMethod: keyof IConnection){
                it(`.${clientMethod}()`, plan(2, async function () {
                    (testCon.server[serverMethod] as any)((p:any) => {
                        expect(p).to.contain(obj(1));
                        return obj(2);
                    });
                    const response = await (testCon.client[clientMethod] as any)(obj(1));
                    expect(response).to.contain(obj(2));
                }));
            }
            function testNotificationToClient(clientMethod: keyof StreamConnectionClient, serverMethod: keyof IConnection){
                it(`.${clientMethod}()`, plan(1, async function () {
                    (testCon.client[clientMethod] as any)((p:any) => {
                        expect(p).to.contain(obj(1));
                    });
                    (testCon.server[serverMethod] as any)(obj(1))
                }));
            }

            testRequestFromClient('initialize', 'onInitialize');
            testRequestFromClient('completion', 'onCompletion');
            testRequestFromClient('definition', 'onDefinition');
            testRequestFromClient('hover', 'onHover');
            testRequestFromClient('references', 'onReferences');
            testRequestFromClient('rename', 'onRenameRequest');
            testRequestFromClient('signatureHelp', 'onSignatureHelp');
            testNotificationToClient('onDiagnostics', 'sendDiagnostics');
        });
    });
});
