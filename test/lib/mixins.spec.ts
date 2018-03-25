import * as asserters from '../../test-kit/asserters';
import { createRange, ProviderRange } from '../../src/lib/completion-providers';
import { Completion } from '../../src/lib/completion-types';


describe('Mixins', function () {

    describe('CSS Class Mixins', function () {
        const createComp = (str: string, rng: ProviderRange, path: string) => asserters.cssMixinCompletion(str, rng, path);

        const str1 = 'momo';
        const from1 = './recursive-import-1.st.css'
        const str2 = 'shlomo';
        const from2 = './recursive-import-1.st.css'
        const str3 = 'Comp';
        const from3 = './recursive-import-2.st.css'
        const str4 = 'local';
        const from4 = 'Local file';
        const froms = [from1, from2, from3, from4];


        [str1, str2, str3, str4].forEach((str, j, a) => {
            str.split('').forEach((c, i) => {
                let prefix = str.slice(0, i);

                it('should be completed from local and imported classes, with prefix ' + prefix, function () {
                    let rng = createRange(15, 15, 15, 15 + i);
                    return asserters.getCompletions('pseudo-elements/recursive-import-3-mixin.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];

                        if (i === 0) {
                            a.forEach((comp, k) => exp.push(createComp(a[k], rng, froms[k])))
                        } else {
                            exp.push(createComp(str, rng, froms[j]));
                            a.forEach((comp, k) => {
                                if (comp !== str) {
                                    notExp.push(createComp(a[k], rng, froms[k]))
                                }
                            })
                        }

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });

                it('should complete local and imported classes after single value, with prefix ' + prefix, function () {
                    let rng = createRange(15, 23, 15, 23 + i);
                    return asserters.getCompletions('pseudo-elements/recursive-import-3-mixin-single-value.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];


                        if (i === 0) {
                            a.forEach((comp, k) => {
                                if (k !== 1) {
                                    exp.push(createComp(comp, rng, froms[k]))
                                } else {
                                    notExp.push(createComp(comp, rng, froms[k]))
                                }
                            })
                        } else {
                            a.forEach((comp, k) => {
                                if (k !== 1 && comp.startsWith(prefix)) {
                                    exp.push(createComp(comp, rng, froms[k]))
                                } else {
                                    notExp.push(createComp(comp, rng, froms[k]))
                                }
                            })
                        }

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });

                it('should complete local and imported classes after multiple values, with prefix ' + prefix, function () {
                    let rng = createRange(15, 28, 15, 28 + i);
                    return asserters.getCompletions('pseudo-elements/recursive-import-3-mixin-multiple-values.st.css', prefix).then((asserter) => {
                        let exp: Partial<Completion>[] = [];
                        let notExp: Partial<Completion>[] = [];


                        if (i === 0) {
                            a.forEach((comp, k) => {
                                if (k !== 1 && k !== 2) {
                                    exp.push(createComp(comp, rng, froms[k]))
                                } else {
                                    notExp.push(createComp(comp, rng, froms[k]))
                                }
                            })
                        } else {
                            a.forEach((comp, k) => {
                                if (k !== 1 && k !== 2 && comp.startsWith(prefix)) {
                                    exp.push(createComp(comp, rng, froms[k]))
                                } else {
                                    notExp.push(createComp(comp, rng, froms[k]))
                                }
                            })
                        }

                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    });
                });
            });
        });
    });

    describe('Code imports', function () {

        const str0 = 'mixin';
        const str1 = 'paramfulMixin';
        const str2 = 'paramlessMixin';
        const str3 = 'aBareMixin';
        const str4 = 'aMixin';
        const badStr = 'notARealMixin'
        const badJsStr = 'aFormatter'
        const tsFrom = './my-mixins.ts';
        const jsFrom = './js-mixins.js';
        const createComp = (str: string, rng: ProviderRange, path: string) => asserters.codeMixinCompletion(str, rng, path);

        describe('TS mixins', function () {

            [str0, str1, str2].forEach((str, j, a) => {
                str.split('').forEach((c, i) => {
                    let prefix = str.slice(0, i);
                    it('should complete imported TS mixins, but not formatters, with prefix ' + prefix, function () {
                        let rng = createRange(12, 15, 12, 15 + i);
                        return asserters.getCompletions('mixins/imported-mixins.st.css', prefix).then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let notExp: Partial<Completion>[] = [];

                            if (i === 0) {
                                exp.push(createComp(str0, rng, tsFrom));
                                exp.push(createComp(str1, rng, tsFrom));
                                exp.push(createComp(str2, rng, tsFrom));
                            } else if (str === str0) {
                                exp.push(createComp(str0, rng, tsFrom));
                                notExp.push(createComp(str1, rng, tsFrom))
                                notExp.push(createComp(str2, rng, tsFrom))
                            } else if (i <= 5) {
                                exp.push(createComp(str1, rng, tsFrom));
                                exp.push(createComp(str2, rng, tsFrom));
                                notExp.push(createComp(str0, rng, tsFrom))
                            } else {
                                exp.push(createComp(str, rng, tsFrom));
                                notExp.push(createComp(a[1 - j], rng, tsFrom))
                                notExp.push(createComp(str0, rng, tsFrom))
                            }
                            notExp.push(createComp(badStr, rng, tsFrom))

                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        });
                    }).timeout(10000);

                    it('should complete imported TS mixins after value, with prefix ' + prefix, function () {
                        let rng = createRange(11, 46, 11, 46 + i);
                        return asserters.getCompletions('mixins/imported-mixins-single-value.st.css', prefix).then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let notExp: Partial<Completion>[] = [];

                            if (i === 0) {
                                exp.push(createComp(str1, rng, tsFrom));
                                exp.push(createComp(str2, rng, tsFrom));
                            } else if (str === str0) {
                                notExp.push(createComp(str1, rng, tsFrom))
                                notExp.push(createComp(str2, rng, tsFrom))
                            } else if (i <= 5) {
                                exp.push(createComp(str1, rng, tsFrom));
                                exp.push(createComp(str2, rng, tsFrom));
                            } else {
                                exp.push(createComp(str, rng, tsFrom));
                                notExp.push(createComp(a[1 - j], rng, tsFrom))
                            }
                            notExp.push(createComp(badStr, rng, tsFrom))

                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        });
                    }).timeout(10000);

                });
            });
        })

        describe('JS Mixins', function () {

            [str3, str4].forEach((str, j, a) => {
                str.split('').forEach((c, i) => {
                    let prefix = str.slice(0, i);
                    it('should complete imported JS mixins, but not formatters, with prefix ' + prefix, function () {
                        let rng = createRange(12, 15, 12, 15 + i);
                        return asserters.getCompletions('mixins/imported-mixins.st.css', prefix).then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let notExp: Partial<Completion>[] = [];

                            if (i <= 1) {
                                a.forEach((comp, k) => exp.push(createComp(a[k], rng, jsFrom)))
                            } else {
                                exp.push(createComp(str, rng, jsFrom));
                                notExp.push(createComp(a[1 - j], rng, jsFrom))
                            }
                            notExp.push(createComp(badJsStr, rng, tsFrom))

                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        });
                    }).timeout(10000);

                    it('should complete imported JS mixins after value, with prefix ' + prefix, function () {
                        let rng = createRange(11, 46, 11, 46 + i);
                        return asserters.getCompletions('mixins/imported-mixins-single-value.st.css', prefix).then((asserter) => {
                            let exp: Partial<Completion>[] = [];
                            let notExp: Partial<Completion>[] = [];

                            if (i <= 1) {
                                a.forEach((comp, k) => exp.push(createComp(a[k], rng, jsFrom)))
                            } else {
                                exp.push(createComp(str, rng, jsFrom));
                                notExp.push(createComp(a[1 - j], rng, jsFrom))
                            }
                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        });
                    }).timeout(10000);

                });
            });

            it('should not complete mixins inside a mixin param list', function () {
                return asserters.getCompletions('mixins/imported-mixins-in-param-list.st.css').then((asserter) => {
                    let rng = createRange(0, 0, 0, 0);
                    let notExp: Partial<Completion>[] = [];

                    notExp.push(createComp('paramlessMixin', rng, tsFrom))
                    notExp.push(createComp('paramfulMixin', rng, tsFrom))
                    notExp.push(createComp('aMixin', rng, jsFrom))
                    notExp.push(createComp('aBareMixin', rng, jsFrom))

                    asserter.notSuggested(notExp);
                });
            })
        })

    });
});

