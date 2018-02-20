import { createRange } from '../../src/server/completion-providers';
import * as asserters from '../../test-kit/asserters';
import { expect } from 'chai';
import * as path from 'path';
import { getReferences, CASES_PATH } from '../../test-kit/asserters';
import { toVscodePath } from '../../src/server/utils/uri-utils';

describe("References", function () {
    describe("Local classes", function () {
        it("should return all instances of local class when called from selector ", function () {
            const refs = getReferences('references/local-class-from-selector.st.css', { line: 5, character: 16 });
            expect(refs.length).to.equal(6);
            expect(refs[0].range).to.deep.equal(createRange(0,3,0,7));
            expect(refs[1].range).to.deep.equal(createRange(5,1,5,5));
            expect(refs[2].range).to.deep.equal(createRange(5,14,5,18));
            expect(refs[3].range).to.deep.equal(createRange(10,22,10,26));
            expect(refs[4].range).to.deep.equal(createRange(15,4,15,8));
            expect(refs[5].range).to.deep.equal(createRange(16,4,16,8));
            refs.forEach(ref => {
                expect(ref.uri).to.equal(toVscodePath(path.join(CASES_PATH, 'references/local-class-from-selector.st.css')));
            })
        });
        it("should return all instances of local class when called from -st-mixin ", function () {
            const refs = getReferences('references/local-class-from-selector.st.css', { line: 15, character: 6 });
            expect(refs.length).to.equal(6);
            expect(refs[0].range).to.deep.equal(createRange(0,3,0,7));
            expect(refs[1].range).to.deep.equal(createRange(5,1,5,5));
            expect(refs[2].range).to.deep.equal(createRange(5,14,5,18));
            expect(refs[3].range).to.deep.equal(createRange(10,22,10,26));
            expect(refs[4].range).to.deep.equal(createRange(15,4,15,8));
            expect(refs[5].range).to.deep.equal(createRange(16,4,16,8));
            refs.forEach(ref => {
                expect(ref.uri).to.equal(toVscodePath(path.join(CASES_PATH, 'references/local-class-from-selector.st.css')));
            })
        });
        it("should return all instances of local class when called from -st-extends ", function () {
            const refs = getReferences('references/local-class-from-selector.st.css', { line: 10, character: 25 });
            expect(refs.length).to.equal(6);
            expect(refs[0].range).to.deep.equal(createRange(0,3,0,7));
            expect(refs[1].range).to.deep.equal(createRange(5,1,5,5));
            expect(refs[2].range).to.deep.equal(createRange(5,14,5,18));
            expect(refs[3].range).to.deep.equal(createRange(10,22,10,26));
            expect(refs[4].range).to.deep.equal(createRange(15,4,15,8));
            expect(refs[5].range).to.deep.equal(createRange(16,4,16,8));
            refs.forEach(ref => {
                expect(ref.uri).to.equal(toVscodePath(path.join(CASES_PATH, 'references/local-class-from-selector.st.css')));
            })
        });
    });
});
