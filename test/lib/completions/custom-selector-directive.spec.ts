import * as asserters from './asserters';
import { createRange } from '../../../src/lib/completion-providers';
import { topLevelDirectives } from '../../../src/lib/completion-types';

describe('Custom selector Directive', () => {
    describe('should be completed at top level ', () => {
        topLevelDirectives.customSelector.split('').map((_c, i) => {
            const prefix = topLevelDirectives.customSelector.slice(0, i);
            it(' with prefix: ' + prefix + ' ', async () => {
                const asserter = await asserters.getCompletions('imports/top-level.st.css', prefix);
                asserter.suggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, i))]);
            });
        });
    });

    it('should be completed even if exists', async () => {
        const asserter = await asserters.getCompletions('imports/top-level-import-exists.st.css');
        asserter.suggested([asserters.customSelectorDirectiveCompletion(createRange(11, 0, 11, 0))]);
    });

    it('should not be completed inside rulesets', async () => {
        const asserter = await asserters.getCompletions('imports/inside-ruleset.st.css');
        asserter.notSuggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not ne completed inside selectors', async () => {
        const asserter = await asserters.getCompletions('imports/before-selector.st.css');
        asserter.notSuggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });

    it('should not be completed inside media query', async () => {
        const asserter = await asserters.getCompletions('imports/media-query.st.css');
        asserter.notSuggested([asserters.customSelectorDirectiveCompletion(createRange(0, 0, 0, 0))]);
    });
});
