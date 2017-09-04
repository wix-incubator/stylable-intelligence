import { valueMapping } from 'stylable';
import { ProviderRange, ProviderPosition, Completion, CompletionProvider, ProviderOptions, snippet } from "./completion-provider";
import { isContainer, isDeclaration } from '../utils/postcss-ast-utils';

function mixinDirective(rng: ProviderRange) {
    return new Completion('-st-mixin:', 'Apply mixins on the class', 'a', new snippet('-st-mixin: $1;'), rng);
}

export class MixinDirectiveProvider implements CompletionProvider {
    provide(options: ProviderOptions): Completion[] {
        if (options.isLineStart && !options.isImport && options.lastRule &&
            (isContainer(options.lastRule) && options.lastRule.nodes!.every(n => isDeclaration(n) && this.text.every(t => t !== n.prop)))) {
            return [mixinDirective(new ProviderRange(
                new ProviderPosition(options.position.line, Math.max(0, options.position.character - options.trimmedLine.length)), options.position))];
        } else {
            return [];
        }
    }
    text: string[] = [valueMapping.mixin]
}
