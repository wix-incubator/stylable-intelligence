import { expect } from 'chai'
import { createProcessor } from '../../src/server/provider-factory'
import { getSignatureHelp } from '../../test-kit/asserters'
import { SignatureHelp, SignatureInformation, ParameterInformation } from 'vscode-languageserver';

describe('Signature Help', function () {
    describe('TS Paramful Mixin', function () {
        let str = "'25','lala','b'";

        str.split('').forEach((c, i) => {
            let prefix = str.slice(0, i);
            it('Provides signature help and identifies active parameter, with prefix ' + prefix, function () {
                let filePath = 'mixins/imported-mixins-paramful-signature.st.css'

                let sig = getSignatureHelp(filePath, prefix)

                let exp: SignatureHelp = {
                    activeSignature: 0,
                    activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                    signatures: [SignatureInformation.create(
                        "paramfulMixin(numParam: stNumber<0, 200>, strParam: styl.stString, aliasedParam: lalaString, enumParam: 'a' | 'b'):  styl.stCssFrag",
                        undefined,
                        ParameterInformation.create("numParam: stNumber<0, 200>"),
                        ParameterInformation.create("strParam: styl.stString"),
                        ParameterInformation.create("aliasedParam: lalaString"),
                        ParameterInformation.create("enumParam: 'a' | 'b'"),
                    )]
                }

                expect(sig).to.not.be.null;
                expect(sig).to.deep.equal(exp)
            }).timeout(5000);
        });
    });

    describe('TS Paramless Mixin', function () {
        it('Provides signature help with no parameters', function () {
            let filePath = 'mixins/imported-mixins-paramless-signature.st.css'

            let sig = getSignatureHelp(filePath, '')

            let exp: SignatureHelp = {
                activeSignature: 0,
                activeParameter: 0,
                signatures: [SignatureInformation.create(
                    "paramlessMixin():  styl.stCssFrag",
                    undefined,
                )]
            }

            expect(sig).to.not.be.null;
            expect(sig).to.deep.equal(exp)
        }).timeout(5000);
    });

    describe('TS Paramful Mixin - Default Import', function () {
        let str = "'25','lala','b'";

        str.split('').forEach((c, i) => {
            let prefix = str.slice(0, i);
            it('Provides signature help and identifies active parameter, with prefix ' + prefix, function () {
                let filePath = 'mixins/imported-mixins-default-paramful-signature.st.css'

                let sig = getSignatureHelp(filePath, prefix)

                let exp: SignatureHelp = {
                    activeSignature: 0,
                    activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                    signatures: [SignatureInformation.create(
                        "mixin(pct: stPercent):  styl.stCssFrag",
                        undefined,
                        ParameterInformation.create("pct: stPercent"),
                    )]
                }

                expect(sig).to.not.be.null;
                expect(sig).to.deep.equal(exp)
            }).timeout(5000);
        });
    });

    describe('JS Paramful Mixin', function () {
        let str = "'25','lala','b'";

        str.split('').forEach((c, i) => {
            let prefix = str.slice(0, i);
            it('Provides signature help and identifies active parameter, with prefix ' + prefix, function () {
                let filePath = 'mixins/imported-mixins-paramful-js-signature.st.css'

                let sig = getSignatureHelp(filePath, prefix)

                let exp: SignatureHelp = {
                    activeSignature: 0,
                    activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                    signatures: [SignatureInformation.create(
                        "aMixin(strParam: stString, numParam: stNumber<0,200>, enumParam: 'a'|'b'): stCssFrag",
                        "A mixin with some params",
                        ParameterInformation.create("strParam: stString", "A string param"),
                        ParameterInformation.create("numParam: stNumber<0,200>", "A num param"),
                        ParameterInformation.create("enumParam: 'a'|'b'", "An enum param"),
                    )]
                }

                expect(sig).to.not.be.null;
                expect(sig).to.deep.equal(exp)
            }).timeout(5000);
        });
    });

    describe('JS Paramless Mixin', function () {
        it('Provides signature help with no parameters', function () {
            let filePath = 'mixins/imported-mixins-paramless-js-signature.st.css'

            let sig = getSignatureHelp(filePath, '')

            let exp: SignatureHelp = {
                activeSignature: 0,
                activeParameter: 0,
                signatures: [SignatureInformation.create(
                    "aBareMixin(): stCssFrag",
                    "A mixin with no params",
                )]
            }

            expect(sig).to.not.be.null;
            expect(sig).to.deep.equal(exp)
        }).timeout(5000);
    });

    xdescribe('JS Paramful Mixin with .d.ts', function () {
        let str = "'25','lala','b'";

        str.split('').forEach((c, i) => {
            let prefix = str.slice(0, i);
            it('Provides signature help and identifies active parameter, with prefix ' + prefix, function () {
                let filePath = 'mixins/imported-mixins-paramful-dts-signature.st.css'

                let sig = getSignatureHelp(filePath, prefix)

                let exp: SignatureHelp = {
                    activeSignature: 0,
                    activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                    signatures: [SignatureInformation.create(
                        "paramfulMixin(numParam: stNumber<0,200>, strParam: styl.stString, aliasedParam: lalaString, enumParam: 'a'|'b'):  styl.stCssFrag",
                        undefined,
                        ParameterInformation.create("numParam: stNumber<0,200>"),
                        ParameterInformation.create("strParam: styl.stString"),
                        ParameterInformation.create("aliasedParam: lalaString"),
                        ParameterInformation.create("enumParam: 'a'|'b'"),
                    )]
                }

                expect(sig).to.not.be.null;
                expect(sig).to.deep.equal(exp)
            }).timeout(5000);
        });
    });

    xdescribe('JS Paramless Mixin with .d.ts', function () {
        it('Provides signature help with no parameters', function () {
            let filePath = 'mixins/imported-mixins-paramless-dts-signature.st.css'

            let sig = getSignatureHelp(filePath, '')

            let exp: SignatureHelp = {
                activeSignature: 0,
                activeParameter: 0,
                signatures: [SignatureInformation.create(
                    "paramlessMixin():  styl.stCssFrag",
                    undefined,
                )]
            }

            expect(sig).to.not.be.null;
            expect(sig).to.deep.equal(exp)
        }).timeout(5000);
    });

    describe('No signature', function () {
        it('outside param area after parentheses', function () {
            let filePath = 'mixins/imported-mixins-paramful-signature-outside-1.st.css'

            let sig = getSignatureHelp(filePath, '')

            expect(sig).to.be.null;
        })

        it('outside param area in mixin name', function () {
            let filePath = 'mixins/imported-mixins-paramful-signature-outside-2.st.css'

            let sig = getSignatureHelp(filePath, '')

            expect(sig).to.be.null;
        })

        it('in value()', function () {
            let filePath = 'variables/inside-value-local-vars.st.css'

            let sig = getSignatureHelp(filePath, '')

            expect(sig).to.be.null;
        })
    });

    describe('State with parameters', () => {
        describe('usage', () => {
            let str = "hello";

            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);
                it('Provides signature help and identifies local state type definition, with prefix ' + prefix, function () {
                    let filePath = 'states/with-param/local-state-param-suggestion.st.css';

                    let sig = getSignatureHelp(filePath, prefix);

                    let exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: 0,
                        signatures: [SignatureInformation.create(
                            "hello(string)",
                            undefined,
                            ParameterInformation.create("string")
                        )]
                    };

                    expect(sig).to.not.be.null;
                    expect(sig).to.deep.equal(exp);
                });
            });

            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);
                it('Provides signature help and identifies imported state type definition, with prefix ' + prefix, function () {
                    let filePath = 'states/with-param/imported-state-param-suggestion.st.css';

                    let sig = getSignatureHelp(filePath, prefix);

                    let exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: 0,
                        signatures: [SignatureInformation.create(
                            "shmover(number)",
                            undefined,
                            ParameterInformation.create("number")
                        )]
                    };

                    expect(sig).to.not.be.null;
                    expect(sig).to.deep.equal(exp);
                });
            });

            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);
                it('Provides signature help and identifies imported state type definition and validators, with prefix ' + prefix, function () {
                    let filePath = 'states/with-param/imported-state-param-and-validators-suggestion.st.css';

                    let sig = getSignatureHelp(filePath, prefix);

                    let exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: 0,
                        signatures: [SignatureInformation.create(
                            "shmover(number(min(3), max(42)))",
                            undefined,
                            ParameterInformation.create("number(min(3), max(42))")
                        )]
                    };

                    expect(sig).to.not.be.null;
                    expect(sig).to.deep.equal(exp);
                });
            });
        });

        describe('definition', () => {
            const types = ['string'];

            types.forEach(str => str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);
                it('Provides signature help and identifies state definition and validators, with prefix ' + prefix, function () {
                    let filePath = 'states/with-param/state-def-with-param-suggestion.st.css';

                    let sig = getSignatureHelp(filePath, prefix);

                    let exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: 0,
                        signatures: [SignatureInformation.create(
                            'Supported state types: "string | number | enum | tag"',
                            undefined,
                            ParameterInformation.create("string | number | enum | tag")
                        )]
                    };

                    expect(sig).to.not.be.null;
                    expect(sig).to.deep.equal(exp);
                });
            }));
        });
    });
});

