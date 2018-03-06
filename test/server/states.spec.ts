import * as asserters from '../../test-kit/asserters';
import { createRange, ProviderRange } from '../../src/server/completion-providers';
import { Completion } from '../../src/server/completion-types';

describe('States', function () {

    describe('Local states', function () {

        const str1 = ':hello';
        const str2 = ':goodbye';
        const str3 = ':holla';
        const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateCompletion(str.slice(1), rng, path);

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);

                it('should complete available states from same file, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(4, 5, 4, 5 + i);
                    return asserters.getCompletions('states/class-with-states.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        exp.push(createComp(a[j], rng));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng));
                        } else {
                            notExp.push(createComp(a[1 - j], rng));
                        }

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });

                it('should complete available states in complex selectors, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(9, 19, 9, 19 + i);
                    return asserters.getCompletions('states/complex-selectors.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        if (str === str1) {
                            exp.push(createComp(str1, rng));
                        } else if (prefix.length <= 1) {
                            exp.push(createComp(str1, rng));
                        }
                        notExp.push(createComp(str2, rng));

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });
            });
        });

        [str1, str3].forEach((str, j, a) => {
            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);

                it('should complete only unused states in complex selectors ending in state name, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(9, 25, 9, 25 + i);
                    return asserters.getCompletions('states/complex-selectors-with-states.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        if (str === str1) {
                            exp.push(createComp(str1, rng));
                        } else if (prefix.length <= 2) {
                            exp.push(createComp(str1, rng));
                        }
                        notExp.push(createComp(str3, rng));

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });
            });
        });

        it('should not complete state value after :: ', function () {
            return asserters.getCompletions('states/class-with-states-double-colon.st.css').then((asserter) => {
                asserter.notSuggested([
                    asserters.stateCompletion('hello', createRange(0, 0, 0, 0)),
                    asserters.stateCompletion('goodbye', createRange(0, 0, 0, 0))
                ]);
            });
        });
    });

    describe('State with param', function () {
        describe('Definition', () => {
            it('should complete available states param types', function () {
                const rng = createRange(1, 22, 1, 22);
                const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateTypeDefinitionCompletion(str, rng, path);

                return asserters.getCompletions('states/with-param/state-def-with-param-start.st.css').then((asserter) => {
                    let exp: Partial<Completion>[] = [];

                    exp.push(createComp('string', rng));
                    exp.push(createComp('number', rng));
                    exp.push(createComp('enum', rng));
                    exp.push(createComp('tag', rng));

                    asserter.suggested(exp);
                });
            });

            describe('String', () => {
                it('should complete available state with the start of a "string" pre-written', function () {
                    const rng = createRange(1, 22, 1, 23);
                    const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateTypeDefinitionCompletion(str, rng, path);

                    return asserters.getCompletions('states/with-param/string/state-def-with-param-string-start.st.css').then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let unExp: Partial<Completion>[] = [];

                        exp.push(createComp('string', rng));

                        unExp.push(createComp('number', rng));
                        unExp.push(createComp('enum', rng));
                        unExp.push(createComp('tag', rng));

                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });
                });

                describe('Validators', () => {
                    it('should complete available state string validators', function () {
                        const rng = createRange(1, 29, 1, 29);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/string/local-state-string-validators.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];

                            exp.push(createComp('regex', rng, 'string'));
                            exp.push(createComp('contains', rng, 'string'));
                            exp.push(createComp('minLength', rng, 'string'));
                            exp.push(createComp('maxLength', rng, 'string'));

                            asserter.suggested(exp);
                        });
                    });

                    it('should complete regex string validator', function () {
                        const rng = createRange(1, 29, 1, 31);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/string/state-def-with-param-string-regex-start.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let unExp: Partial<Completion>[] = [];

                            exp.push(createComp('regex', rng, 'string'));

                            unExp.push(createComp('contains', rng, 'string'));
                            unExp.push(createComp('minLength', rng, 'string'));
                            unExp.push(createComp('maxLength', rng, 'string'));

                            asserter.suggested(exp);
                            asserter.notSuggested(unExp);
                        });
                    });

                    it('should complete contains string validator', function () {
                        const rng = createRange(1, 29, 1, 30);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/string/state-def-with-param-string-contains-start.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let unExp: Partial<Completion>[] = [];

                            exp.push(createComp('contains', rng, 'string'));

                            unExp.push(createComp('regex', rng, 'string'));
                            unExp.push(createComp('minLength', rng, 'string'));
                            unExp.push(createComp('maxLength', rng, 'string'));

                            asserter.suggested(exp);
                            asserter.notSuggested(unExp);
                        });
                    });

                    it('should complete min/max Length string validators', function () {
                        const rng = createRange(1, 29, 1, 30);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/string/state-def-with-param-string-m-start.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let unExp: Partial<Completion>[] = [];

                            exp.push(createComp('minLength', rng, 'string'));
                            exp.push(createComp('maxLength', rng, 'string'));

                            unExp.push(createComp('regex', rng, 'string'));
                            unExp.push(createComp('contains', rng, 'string'));

                            asserter.suggested(exp);
                            asserter.notSuggested(unExp);
                        });
                    });
                });
            });
            describe('Number', () => {
                it('should complete available state with the start of a "number" pre-written', function () {
                    const rng = createRange(1, 22, 1, 23);
                    const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateTypeDefinitionCompletion(str, rng, path);

                    return asserters.getCompletions('states/with-param/number/state-def-with-param-number-start.st.css').then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let unExp: Partial<Completion>[] = [];

                        exp.push(createComp('number', rng));

                        unExp.push(createComp('string', rng));
                        unExp.push(createComp('enum', rng));
                        unExp.push(createComp('tag', rng));

                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });
                });

                describe('Validators', () => {
                    it('should complete available state number validators', function () {
                        const rng = createRange(1, 29, 1, 29);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/number/local-state-number-validators.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];

                            exp.push(createComp('min', rng, 'number'));
                            exp.push(createComp('max', rng, 'number'));
                            exp.push(createComp('multipleOf', rng, 'number'));

                            asserter.suggested(exp);
                        });
                    });

                    it('should complete min number validator', function () {
                        const rng = createRange(1, 29, 1, 31);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/number/state-def-with-param-number-min-start.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let unExp: Partial<Completion>[] = [];

                            exp.push(createComp('min', rng, 'number'));

                            unExp.push(createComp('max', rng, 'number'));
                            unExp.push(createComp('multipleOf', rng, 'number'));

                            asserter.suggested(exp);
                            asserter.notSuggested(unExp);
                        });
                    });

                    it('should complete max number validator', function () {
                        const rng = createRange(1, 29, 1, 31);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/number/state-def-with-param-number-max-start.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let unExp: Partial<Completion>[] = [];

                            exp.push(createComp('max', rng, 'number'));

                            unExp.push(createComp('min', rng, 'number'));
                            unExp.push(createComp('multipleOf', rng, 'number'));

                            asserter.suggested(exp);
                            asserter.notSuggested(unExp);
                        });
                    });

                    it('should complete multipleOf number validator', function () {
                        const rng = createRange(1, 29, 1, 31);
                        const createComp = (validator: string, rng: ProviderRange, type: string, path?: string) => asserters.stateValidatorDefinitionCompletion(validator, rng, type, path);

                        return asserters.getCompletions('states/with-param/number/state-def-with-param-number-multiple-start.st.css').then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let unExp: Partial<Completion>[] = [];

                            exp.push(createComp('multipleOf', rng, 'number'));

                            unExp.push(createComp('min', rng, 'number'));
                            unExp.push(createComp('max', rng, 'number'));

                            asserter.suggested(exp);
                            asserter.notSuggested(unExp);
                        });
                    });
                });
            });

            describe('Enum', () => {
                it('should complete available state with the start of a "enum" pre-written', function () {
                    const rng = createRange(1, 22, 1, 23);
                    const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateTypeDefinitionCompletion(str, rng, path);

                    return asserters.getCompletions('states/with-param/enum/state-def-with-param-enum-start.st.css').then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let unExp: Partial<Completion>[] = [];

                        exp.push(createComp('enum', rng));

                        unExp.push(createComp('number', rng));
                        unExp.push(createComp('tag', rng));
                        unExp.push(createComp('string', rng));

                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });
                });
            });

            describe('Tag', () => {
                it('should complete available state with the start of a "tag" pre-written', function () {
                    const rng = createRange(1, 22, 1, 23);
                    const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateTypeDefinitionCompletion(str, rng, path);

                    return asserters.getCompletions('states/with-param/tag/state-def-with-param-tag-start.st.css').then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let unExp: Partial<Completion>[] = [];

                        exp.push(createComp('tag', rng));

                        unExp.push(createComp('number', rng));
                        unExp.push(createComp('enum', rng));
                        unExp.push(createComp('string', rng));

                        asserter.suggested(exp);
                        asserter.notSuggested(unExp);
                    });
                });
            });
        });

        describe('Usage', () => {
            it('should complete available states from same file (with parenthesis)', function () {
                const rng = createRange(4, 5, 4, 5);
                const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateCompletion(str.slice(1), rng, path, true);

                return asserters.getCompletions('states/with-param/local-state-param.st.css').then((asserter) => {
                    let exp: Partial<Completion>[] = [];

                    exp.push(createComp(':hello', rng));

                    asserter.suggested(exp);
                });
            });

            it('should complete imported state (with parenthesis)', function () {
                const rng = createRange(9, 5, 9, 5);
                const createComp = (str: string, rng: ProviderRange, path?: string) => asserters.stateCompletion(str.slice(1), rng, path, true);

                return asserters.getCompletions('states/with-param/imported-state-param.st.css').then((asserter) => {
                    let exp: Partial<Completion>[] = [];

                    exp.push(createComp(':shmover', rng, './comp-to-import-with-param.st.css'));

                    asserter.suggested(exp);
                });
            });
        });
    });

    describe('Imported states', function () {

        const str1 = ':state';
        const str2 = ':otherState';
        const str3 = ':anotherState';
        const str4 = ':oneMoreState';

        const createComp = (str: string, rng: ProviderRange, path: string) => asserters.stateCompletion(str.slice(1), rng, path);

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);

                it('should complete state ' + str + ' value for default import used as tag, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(6, 4, 6, 4 + i);
                    return asserters.getCompletions('pseudo-elements/default-import-as-tag.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        exp.push(createComp(a[j], rng, './import.st.css'));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, './import.st.css'));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, './import.st.css'));
                        }

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });

                it('should complete state ' + str + ' value for local class extending default import, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(9, 5, 9, 5 + i);
                    return asserters.getCompletions('pseudo-elements/default-import-extended.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        exp.push(createComp(a[j], rng, './import.st.css'));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, './import.st.css'));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, './import.st.css'));
                        }

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });

            });
        });

        [str3, str4].forEach((str, j, a) => {
            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);

                it('should complete state ' + str + ' value for local class extending named import, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(9, 5, 9, 5 + i);
                    return asserters.getCompletions('pseudo-elements/named-import-extended-named.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        exp.push(createComp(a[j], rng, './import.st.css'));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, './import.st.css'));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, './import.st.css'));
                        }
                        notExp.push(createComp(str1, rng, './import.st.css'));
                        notExp.push(createComp(str2, rng, './import.st.css'));

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });
            });
        });

        [str1, str2].forEach((str, j, a) => {
            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);
                it('should complete state ' + str + ' after pseudo-element, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(10, 11, 10, 11 + i);
                    return asserters.getCompletions('pseudo-elements/recursive-import-3.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        exp.push(createComp(a[j], rng, './recursive-import-1.st.css'));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, './recursive-import-1.st.css'));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, './recursive-import-1.st.css'));
                        }
                        notExp.push(createComp(str3, rng, './recursive-import-1.st.css'));
                        notExp.push(createComp(str4, rng, './recursive-import-1.st.css'));

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });

                it('should complete state ' + str + ' after pseudo-element when line has leading spaces, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(10, 12, 10, 12 + i);
                    return asserters.getCompletions('pseudo-elements/recursive-import-3-leading-space.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        exp.push(createComp(a[j], rng, './recursive-import-1.st.css'));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, './recursive-import-1.st.css'));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, './recursive-import-1.st.css'));
                        }
                        notExp.push(createComp(str3, rng, './recursive-import-1.st.css'));
                        notExp.push(createComp(str4, rng, './recursive-import-1.st.css'));

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });
            });
        });

        [str3, str4].forEach((str, j, a) => {
            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);
                it('should complete only unused pseudo-element states when pseudo-element state exists, with prefix ' + prefix + ' ', function () {
                    let rng = createRange(9, 25, 9, 25 + i);
                    return asserters.getCompletions('pseudo-elements/multiple-states.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        if (prefix.length <= 1 || str === str4) {
                            exp.push(createComp(str4, rng, './import.st.css'));
                        }
                        notExp.push(createComp(str1, rng, './import.st.css'));
                        notExp.push(createComp(str2, rng, './import.st.css'));
                        notExp.push(createComp(str3, rng, './import.st.css'));

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });
            });
        });
    });

    describe('Deep recursive imports', function () {
        let str = ':loompa';
        const createComp = (str: string, rng: ProviderRange, path: string) => asserters.stateCompletion(str.slice(1), rng, path);

        str.split('').forEach((c, i) => {
            let prefix = str.slice(0, i);
            let rng = createRange(10, 52, 10, 52 + i);
            it('should complete state ' + str + ' in deep chain ending with state, with prefix ' + prefix + ' ', function () {
                return asserters.getCompletions('pseudo-elements/recursive-import-3-deep-state.st.css', prefix).then((asserter) => {
                    let exp: Partial<Completion>[] = [];
                    let notExp: Partial<Completion>[] = [];

                    exp.push(createComp(str, rng, './recursive-import-0.st.css'));

                    asserter.suggested(exp);
                    asserter.notSuggested(notExp);
                });
            });
        });
    });
});
