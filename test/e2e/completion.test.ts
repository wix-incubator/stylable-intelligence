import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
const pkgDir = require('pkg-dir');


suite("Extension Tests", () => {
    let rootDir: string;
    suiteSetup(async () => {
        rootDir = await pkgDir(__dirname);
    });

    function testCompletion(fileToTest: string, testCases: [vscode.Position, string[]][]) {
        const casesPath = path.join(rootDir, 'fixtures', 'e2e-cases', fileToTest);
        const ext = vscode.extensions.getExtension('wix.stylable-intelligence');
        let testDoc: vscode.TextDocument

        if (ext) {
            return vscode.workspace.openTextDocument(casesPath)
                .then((doc) => {
                    testDoc = doc;
                    return vscode.window.showTextDocument(testDoc)
                })
                .then(() => ext.activate())
                .then(() => {
                    return Promise.all(testCases.map(([position, expected]) => {
                        return vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', testDoc.uri, position)
                            .then(list => {
                                let labels = list!.items.map(x => x.label);
                                for (let entry of expected) {
                                    if (!~labels.indexOf(entry)) {
                                        assert.fail('', entry, 'missing expected item in completion list', '');
                                    }
                                }
                                return Promise.resolve()
                            })
                    }))
                });
        } else {
            throw new Error('Where is my extension?!!')
        }
    }


    test("simple completion", function () {
        this.timeout(30000)
        const testCases: [vscode.Position, string[]][] = [
            [new vscode.Position(0, 0), [':import', '.root', ':vars', '.gaga', '@namespace']]
        ];
        return testCompletion('simple-completion.st.css', testCases);
    });

    test("simple completion includes css completions", function () {
        this.timeout(30000)
        const testCases: [vscode.Position, string[]][] = [
            [new vscode.Position(2, 11), ['goldenrod']]
        ];
        return testCompletion('simple-completion.st.css', testCases);
    });

    test("advanced completion", function () {
        this.timeout(30000)
        const testCases: [vscode.Position, string[]][] = [
            [new vscode.Position(10, 6), [':shmover', ':bover']]
        ];
        return testCompletion('advanced-completion.st.css', testCases);
    });

    //Fix it so it tests something real (no :import)
    test.skip("No completions on .css files", function () {
        let starr: string[] = [];
        const testCases: [vscode.Position, string[]][] = [[new vscode.Position(0, 0), []]];
        return testCompletion('simple-completion.css', testCases);
    });

});

