import { expect } from 'chai';
import { getDocumentColors, getDocColorPresentation } from '../../test-kit/asserters';
import { Color } from 'vscode-languageserver-protocol';
import { createRange } from '../../src/lib/completion-providers';

export function createColor(red: number, green: number, blue: number, alpha: number): Color {
    return { red, green, blue, alpha } as Color
}

describe('Colors', function () {
    describe('DocumentColor', () => {
        it('should resolve information for a single color', function () {
            const res = getDocumentColors('colors/single-color.st.css');

            expect(res).to.eql([{
                range: createRange(1, 11, 1, 14),
                color: createColor(1, 0, 0, 1)
            }]);
        });

        it('should resolve information for a variable color', function () {
            const res = getDocumentColors('colors/single-var-color.st.css');

            expect(res).to.eql([
                {
                    range: createRange(5, 11, 5, 23),
                    color: createColor(0, 1, 0, 0.8)
                },
                {
                    range: createRange(1, 12, 1, 31),
                    color: createColor(0, 1, 0, 0.8)
                }
            ]);
        });

        it('should resolve information for a single imported color', function () {
            const res = getDocumentColors('colors/imported-color.st.css');

            expect(res).to.eql([{
                range: createRange(2, 15, 2, 21),
                color: createColor(0, 1, 0, 0.8)
            }])
        });
    });

    describe('ColorPresentation', () => {
        it('should return presentation in variable definition', function () {

            const range = createRange(1, 12, 1, 31)
            const color = {
                red: 0, green: 1, blue: 0, alpha: 0.8
            }
            const res = getDocColorPresentation('colors/color-presentation.st.css', color, range);
            expect(res.length).to.equal(3);
            expect(res.filter(cp => cp.label === "rgba(0, 255, 0, 0.8)").length).to.equal(1)
        })

        it('should not return presentation in variable usage', function () {
            const range = createRange(5, 11, 5, 23)
            const color = {
                red: 0, green: 1, blue: 0, alpha: 0.8
            }
            const res = getDocColorPresentation('colors/color-presentation.st.css', color, range);
            expect(res.length).to.equal(0);
        })

        it('should not return presentation in -st-named', function () {
            const range = createRange(2, 15, 2, 21)
            const color = {
                red: 0, green: 1, blue: 0, alpha: 0.8
            }
            const res = getDocColorPresentation('colors/color-presentation-import.st.css', color, range);
            expect(res.length).to.equal(0);
        })

    });
});

