import * as asserters from '../test-kit/asserters';

describe('Imports', function () {

    it('should complete :import at top level after ""', function () {
        return asserters.getCompletions('imports/top-level-no-chars.css').then((asserter) => {
            asserter.suggested([
                asserters.importCompletion
            ]);
            asserter.notSuggested([
            ]);
        });
    });

    it('should complete :import at top level after ":"', function () {
        return asserters.getCompletions('imports/top-level-colon.css').then((asserter) => {
            asserter.suggested([
                asserters.importCompletion
            ]);
            asserter.notSuggested([
                asserters.rootCompletion,
                asserters.classCompletion('gaga'),
                asserters.statesDirectiveCompletion,
                asserters.extendsDirectiveCompletion,
                asserters.mixinDirectiveCompletion,
                asserters.variantDirectiveCompletion
            ]);
        });
    });

    it('should complete :import at top level even if exists', function () {
        return asserters.getCompletions('imports/top-level-import-exists.css').then((asserter) => {
            asserter.suggested([
                asserters.importCompletion,
            ]);
            asserter.notSuggested([
                asserters.rootCompletion,
                asserters.classCompletion('gaga'),
                asserters.statesDirectiveCompletion,
                asserters.extendsDirectiveCompletion,
                asserters.mixinDirectiveCompletion,
                asserters.variantDirectiveCompletion
            ]);
        });
    });

    it('should not complete :import after ::', function () {
        return asserters.getCompletions('imports/top-level-colon-colon.css').then((asserter) => {
            asserter.suggested([]);
            asserter.notSuggested([
                asserters.importCompletion,
                asserters.rootCompletion,
                asserters.classCompletion('gaga'),
                asserters.statesDirectiveCompletion,
                asserters.extendsDirectiveCompletion,
                asserters.mixinDirectiveCompletion,
                asserters.variantDirectiveCompletion
            ]);
        });
    });

    it('should not complete :import inside selectors', function () {
        return asserters.getCompletions('imports/inside-simple-selector.css').then((asserter) => {
            asserter.suggested([]);
            asserter.notSuggested([
                asserters.importFromDirectiveCompletion,
                asserters.importDefaultDirectiveCompletion,
                asserters.importNamedDirectiveCompletion,
                asserters.importCompletion
            ]);
        });
    });

    it('should complete -st-from, -st-default, -st-named inside import statements', function () {
        return asserters.getCompletions('imports/inside-import-selector.css').then((asserter) => {
            asserter.suggested([
                asserters.importFromDirectiveCompletion,
                asserters.importDefaultDirectiveCompletion,
                asserters.importNamedDirectiveCompletion
            ]);
            asserter.notSuggested([
                asserters.importCompletion,
                asserters.statesDirectiveCompletion,
                asserters.extendsDirectiveCompletion,
                asserters.variantDirectiveCompletion,
                asserters.mixinDirectiveCompletion
            ]);
        });
    });

    it('should not complete -st-from, -st-default, -st-named inside import statements when exists', function () {
        return asserters.getCompletions('imports/inside-import-selector-with-fields.css').then((asserter) => {
            asserter.notSuggested([
                asserters.importFromDirectiveCompletion,
                asserters.importDefaultDirectiveCompletion,
                asserters.importNamedDirectiveCompletion,
                asserters.statesDirectiveCompletion,
                asserters.extendsDirectiveCompletion,
                asserters.variantDirectiveCompletion,
                asserters.mixinDirectiveCompletion
            ]);
        });
    });

    it('completes default and named imports in -st-extends', function () {
        return asserters.getCompletions('imports/st-extends.css', true).then((asserter) => {
            asserter.suggested([
                asserters.extendsCompletion('Comp'),
                asserters.extendsCompletion('shlomo')
            ]);
            asserter.notSuggested([
                asserters.importCompletion,
                asserters.mixinDirectiveCompletion
            ]);
        });
    });

    it('completes named and default imports in -st-extends when a following ; exists', function () {
        return asserters.getCompletions('imports/st-extends-with-semicolon.css').then((asserter) => {
            asserter.suggested([
                asserters.extendsCompletion('Comp'),
                asserters.extendsCompletion('shlomo')
            ]);
            asserter.notSuggested([
                asserters.importCompletion,
                asserters.mixinDirectiveCompletion
            ]);
        });
    });

    it('completes named and default imports as initial selectors', function () {
        return asserters.getCompletions('imports/st-extends-selectors.css').then((asserter) => {
            asserter.suggested([
                asserters.classCompletion('Comp',true),
                asserters.classCompletion('shlomo'),
                asserters.importCompletion
            ]);
            asserter.notSuggested([
                asserters.mixinDirectiveCompletion
            ]);
        });
    });

    it('completes named and default imports as non-initial selectors', function () {
        return asserters.getCompletions('imports/st-extends-complex-selectors.css').then((asserter) => {
            asserter.suggested([
                asserters.classCompletion('shlomo'),
                asserters.classCompletion('Comp',true),
            ]);
            asserter.notSuggested([
                asserters.importCompletion,
                asserters.mixinDirectiveCompletion,
            ]);
        });
    });

});
