import * as asserters from '../test-kit/asserters';
import { createRange } from '../src/completion-providers'
import { importDirectives, rulesetDirectives } from '../src/completion-types';

describe('Inner Directives', function () {


    describe('should complete -st-from inside import selector ', function () {
        importDirectives.from.split('').map((c, i) => {
            let prefix = importDirectives.from.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-import-selector.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.importFromDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    describe('should complete -st-default inside import selector ', function () {
        importDirectives.default.split('').map((c, i) => {
            let prefix = importDirectives.default.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-import-selector.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.importDefaultDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    describe('should complete -st-named inside import selector ', function () {
        importDirectives.named.split('').map((c, i) => {
            let prefix = importDirectives.named.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-import-selector.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.importNamedDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    describe('should complete -st-theme inside import selector ', function () {
        importDirectives.theme.split('').map((c, i) => {
            let prefix = importDirectives.theme.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-import-selector.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.themeDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    it('should not complete -st-from, -st-default, -st-named, -st-theme inside import directives when exists', function () {
        return asserters.getCompletions('imports/inside-import-selector-with-fields.css').then((asserter) => {
            asserter.notSuggested([
                asserters.importFromDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.importDefaultDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.importNamedDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.themeDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });
    });

    it('should not complete -st-from, -st-default, -st-named, -st-theme outisde the import ruleset', function () {
        return asserters.getCompletions('imports/outside-ruleset.css').then((asserter) => {
            asserter.notSuggested([
                asserters.importFromDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.importDefaultDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.importNamedDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.themeDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });
    });

    describe('should complete -st-states inside simple selector ruleset ', function () {
        rulesetDirectives.states.split('').map((c, i) => {
            let prefix = rulesetDirectives.states.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-ruleset.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.statesDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    describe('should complete -st-extends inside simple selector ruleset ', function () {
        rulesetDirectives.extends.split('').map((c, i) => {
            let prefix = rulesetDirectives.extends.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-ruleset.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.extendsDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    describe('should complete -st-mixin inside simple selector ruleset ', function () {
        rulesetDirectives.mixin.split('').map((c, i) => {
            let prefix = rulesetDirectives.mixin.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-ruleset.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.mixinDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    describe('should complete -st-variant inside simple selector ruleset ', function () {
        rulesetDirectives.variant.split('').map((c, i) => {
            let prefix = rulesetDirectives.variant.slice(0, i);
            it(' with Prefix: ' + prefix + ' ', function () {
                return asserters.getCompletions('imports/inside-ruleset.css', prefix).then((asserter) => {
                    asserter.suggested([
                        asserters.variantDirectiveCompletion(createRange(2, 4, 2, 4 + i))
                    ]);
                });
            });
        });
    });

    it('should not complete -st-states, -st-extends, -st-mixin, -st-variant inside simple selector ruleset when they exist', function () {
        return asserters.getCompletions('general/inside-simple-ruleset-with-all-st-fields.css').then((asserter) => {
            asserter.notSuggested([
                asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.mixinDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.variantDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });
    });

    it('should complete -st-mixin, but not -st-states, -st-extends, -st-variant inside media query', function () {
        return asserters.getCompletions('complex-selectors/media-query.css').then((asserter) => {
            asserter.suggested([
                asserters.mixinDirectiveCompletion(createRange(2, 8, 2, 8)),
            ])
            asserter.notSuggested([
                asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
                asserters.variantDirectiveCompletion(createRange(0, 0, 0, 0)),
            ]);
        });
    });

    describe('should complete -st-mixin, but not -st-states, -st-extends, -st-variant inside complex rules', function () {
        [
            'complex-selectors/class-and-class.css',
            'complex-selectors/class-and-descendant.css',
            'complex-selectors/class-and-tag.css',
            'complex-selectors/tag-and-class.css',
            'complex-selectors/class-and-state.css',
        ].map((src) => {
            it('complex rule ' + src.slice(0, src.indexOf('{')), function () {
                return asserters.getCompletions(src).then((asserter) => {
                    asserter.suggested([
                        asserters.mixinDirectiveCompletion(createRange(1, 4, 1, 4)),
                    ])
                    asserter.notSuggested([
                        asserters.statesDirectiveCompletion(createRange(0, 0, 0, 0)),
                        asserters.extendsDirectiveCompletion(createRange(0, 0, 0, 0)),
                        asserters.variantDirectiveCompletion(createRange(0, 0, 0, 0)),
                    ]);
                });
            })
        });
    });
});
