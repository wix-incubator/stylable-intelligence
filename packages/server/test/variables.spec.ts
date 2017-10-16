import * as asserters from '../test-kit/asserters';
import { createRange } from '../src/completion-providers'

describe('Variables', function () {

    describe('value()', function () {

        'value('.split('').map((c, i) => {
            let prefix = 'value('.slice(0, i);

            it('should be completed inside rule value, with prefix ' + prefix + ' ', function () {
                return asserters.getCompletions('variables/local-vars.st.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.valueDirective(createRange(6, 10, 6, 11 + i)),
                    ]);
                });
            });

            it('should be completed inside rule value when other values exist, with prefix ' + prefix + ' ', function () {
                return asserters.getCompletions('variables/local-vars-several-values.st.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.valueDirective(createRange(6, 25, 6, 26 + i)),
                    ]);
                });
            });

            it('should be completed inside rule value inside a complex selector, with prefix ' + prefix + ' ', function () {
                return asserters.getCompletions('variables/complex-selector.st.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.valueDirective(createRange(15, 10, 15, 11 + i)),
                    ]);
                });
            });
        });

        it('should not be completed for st-directives', function () {
            return asserters.getCompletions('variables/directive.st.css').then((asserter) => {
                asserter.notSuggested([
                    asserters.valueDirective(createRange(6, 17, 6, 17)),
                ]);
            });
        });

        it('should not be completed inside other value()', function () {
            return asserters.getCompletions('variables/inside-value-local-vars.st.css').then((asserter) => {
                asserter.notSuggested([
                    asserters.valueDirective(createRange(6, 23, 6, 23)),
                ]);
            });

        });
    })

    describe('Inside value()', function () {
        const str1 = 'color1';
        const str2 = 'color2';

        str1.split('').forEach((c, i) => {
            let prefix = str1.slice(0, i);
            it('Local variables should be completed, with prefix ' + prefix + ' ', function () {
                return asserters.getCompletions('variables/inside-value-local-vars.st.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.valueCompletion(str1, createRange(6, 27, 6, 27 + i), 'red', 'Local variable'),
                        asserters.valueCompletion(str2, createRange(6, 27, 6, 27 + i), 'blue', 'Local variable'),
                    ])
                });
            });

            it('Local variables should be completed, with prefix ' + prefix + ' ', function () {
                return asserters.getCompletions('variables/inside-value-imported-vars.st.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.valueCompletion(str1, createRange(6, 27, 6, 27 + i), 'red', 'Local variable'),
                        asserters.valueCompletion(str2, createRange(6, 27, 6, 27 + i), 'blue', 'Local variable'),
                    ])
                });
            });

        });
    });
});

