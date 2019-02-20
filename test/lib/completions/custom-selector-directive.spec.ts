import * as asserters from './asserters';
import { createRange } from '../../../src/lib/completion-providers';
import { topLevelDirectives } from '../../../src/lib/completion-types';

describe('Custom selector Directive', () => {
    describe('should be completed at top level ', () => {
        topLevelDirectives.customSelector.split('').map((c, i) => {
            const prefix = topLevelDirectives.customSelector.slice(0, i);
            it(' with prefix: ' + prefix + ' ', () => {
                return asserters.getCompletions('imports/top-level.st.css', prefix).then(asserter => {
                    asserter.suggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, i))]);
                });
            });
        });
    });

    it('should be completed even if exists', () => {
        return asserters.getCompletions('imports/top-level-import-exists.st.css').then(asserter => {
            asserter.suggested([asserters.customSelectorDirectiveCompletion(createRange(11, 0, 11, 0))]);
        });
    });

    it('should not be completed inside rulesets', () => {
        return asserters.getCompletions('imports/inside-ruleset.st.css').then(asserter => {
            asserter.notSuggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0))]);
        });
    });

    it('should not ne completed inside selectors', () => {
        return asserters.getCompletions('imports/before-selector.st.css').then(asserter => {
            asserter.notSuggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0))]);
        });
    });

    it('should not be completed inside media query', () => {
        return asserters.getCompletions('imports/media-query.st.css').then(asserter => {
            asserter.notSuggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0))]);
        });
    });
});
