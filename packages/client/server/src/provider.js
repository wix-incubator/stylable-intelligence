"use strict";
//must remain independent from vscode
Object.defineProperty(exports, "__esModule", { value: true });
var stylable_1 = require("stylable");
var postcss_ast_utils_1 = require("./utils/postcss-ast-utils");
var selector_analyzer_1 = require("./utils/selector-analyzer");
var ProviderPosition = (function () {
    function ProviderPosition(line, character) {
        this.line = line;
        this.character = character;
    }
    return ProviderPosition;
}());
exports.ProviderPosition = ProviderPosition;
var ProviderRange = (function () {
    function ProviderRange(start, end) {
        this.start = start;
        this.end = end;
    }
    return ProviderRange;
}());
exports.ProviderRange = ProviderRange;
var Completion = (function () {
    function Completion(label, detail, sortText, insertText, range, additionalCompletions) {
        if (detail === void 0) { detail = ""; }
        if (sortText === void 0) { sortText = 'd'; }
        if (insertText === void 0) { insertText = label; }
        if (additionalCompletions === void 0) { additionalCompletions = false; }
        this.label = label;
        this.detail = detail;
        this.sortText = sortText;
        this.insertText = insertText;
        this.range = range;
        this.additionalCompletions = additionalCompletions;
    }
    return Completion;
}());
exports.Completion = Completion;
var snippet = (function () {
    function snippet(source) {
        this.source = source;
    }
    return snippet;
}());
exports.snippet = snippet;
function singleLineRange(line, start, end) {
    return {
        start: {
            line: line,
            character: start
        },
        end: {
            line: line,
            character: end
        }
    };
}
// Completions
// CompItemKinds for icons:
//  .<class> - Class
// value(<var>) -> Variable
// -st-named -> (var -> Variable, cls -> Class)
// :<state> -> Enum
// :vars -> Keyword
// :import -> Keyword
// -st-* directive -> Keyword
//
var rootClass = new Completion('.root', 'The root class', 'b');
function importsDirective(rng) {
    return new Completion(':import', 'Import an external library', 'a', new snippet(':import {\n\t-st-from: "$1";\n}$0'), rng);
}
// function varsDirective(rng: ProviderRange) {
//     return new Completion(':vars', 'Declare variables', 'a', new snippet(':vars {\n\t$1\n}$0'), rng);
// }
var extendsDirective = new Completion(stylable_1.valueMapping.extends + ':', 'Extend an external component', 'a', new snippet('-st-extends: $1;'), undefined, true);
var statesDirective = new Completion('-st-states:', 'Define the CSS states available for this class', 'a', new snippet('-st-states: $1;'));
var mixinDirective = new Completion('-st-mixin:', 'Apply mixins on the class', 'a', new snippet('-st-mixin: $1;'));
var variantDirective = new Completion('-st-variant:', '', 'a', new snippet('-st-variant: true;'));
var fromDirective = new Completion('-st-from:', 'Path to library', 'a', new snippet('-st-from: "$1";'));
var namedDirective = new Completion('-st-named:', 'Named object export name', 'a', new snippet('-st-named: $1;'));
var defaultDirective = new Completion('-st-default:', 'Default object export name', 'a', new snippet('-st-default: $1;'));
function classCompletion(className) {
    return new Completion('.' + className, 'mine', 'b');
}
function extendCompletion(symbolName, range) {
    return new Completion(symbolName, 'yours', 'a', new snippet(' ' + symbolName + ';\n'), range);
}
function stateCompletion(stateName, from, pos) {
    return new Completion(':' + stateName, 'from: ' + from, 'a', new snippet(':' + stateName), singleLineRange(pos.line, pos.character - 1, pos.character));
}
function fileNameCompletion(name) {
    return new Completion(name, '', 'a', './' + name);
}
function addExistingClasses(meta, completions) {
    if (meta == undefined)
        return;
    Object.keys(meta.classes).forEach(function (className) {
        if (className === 'root') {
            return;
        }
        completions.push(classCompletion(className));
    });
}
function isIllegalLine(line) {
    return !!/^\s*[-\.:]*\s*$/.test(line);
}
var lineEndsRegexp = /({|}|;)/;
function isSpacy(char) {
    return char === '' || char === ' ' || char === '\t' || char === '\n';
}
var Provider = (function () {
    function Provider(resolver) {
        this.resolver = resolver;
    }
    Provider.prototype.getClassDefinition = function (meta, symbol) {
        // const symbols = resolver.resolveSymbols(stylesheet);
    };
    Provider.prototype.provideCompletionItemsFromSrc = function (src, position, filePath) {
        // debugger;
        var cursorLineIndex = position.character;
        var lines = src.split('\n');
        var currentLine = lines[position.line];
        var fixedSrc = src;
        console.log('Current line I: ', currentLine);
        if (currentLine.match(lineEndsRegexp)) {
            var currentLocation = 0;
            var splitLine = currentLine.split(lineEndsRegexp);
            for (var i = 0; i < splitLine.length; i += 2) {
                currentLocation += splitLine[i].length + 1;
                if (currentLocation >= position.character) {
                    currentLine = splitLine[i];
                    console.log('Current line II: ', currentLine);
                    if (isIllegalLine(currentLine)) {
                        splitLine[i] = '\n';
                        lines.splice(position.line, 1, splitLine.join(''));
                        fixedSrc = lines.join('\n');
                    }
                    break;
                }
                else {
                    cursorLineIndex -= splitLine[i].length + 1;
                }
            }
        }
        else if (isIllegalLine(currentLine)) {
            lines.splice(position.line, 1, "");
            fixedSrc = lines.join('\n');
        }
        console.log('Made fixedSrc');
        console.log(fixedSrc);
        debugger;
        var meta;
        try {
            meta = stylable_1.process(stylable_1.safeParse(fixedSrc, { from: filePath.slice(7) }));
        }
        catch (error) {
            console.log(error);
            return Promise.resolve([]);
        }
        console.log('PostCSS successful');
        // console.log('Transpiling Stylesheet');
        // try {
        //     stylesheet = fromCSS(fixedSrc, undefined, filePath);
        //     console.log('Transpiling Stylesheet success');
        // } catch (error) {
        //     console.log('Transpiling Stylesheet fail');
        //     console.error('stylable transpiling failed');
        // }
        console.log('Calling resolveDependencies');
        // debugger;
        console.log('Calling AST completions with: ');
        console.log('position: ', JSON.stringify(position, null, '\t'));
        console.log('currentLine: ', JSON.stringify(currentLine, null, '\t'));
        console.log('cursorLineIndex: ', JSON.stringify(cursorLineIndex, null, '\t'), '\n');
        return this.provideCompletionItemsFromAst(src, position, filePath, meta, currentLine, cursorLineIndex);
        // return resolver.resolveDependencies(meta)
        //     .then<Completion[]>(() => {
        //         console.log('Calling AST completions with: ')
        //         console.log('position: ', JSON.stringify(position, null, '\t'))
        //         console.log('currentLine: ', JSON.stringify(currentLine, null, '\t'))
        //         console.log('cursorLineIndex: ', JSON.stringify(cursorLineIndex, null, '\t'), '\n')
        //         return this.provideCompletionItemsFromAst(src, position, filePath, resolver, meta, currentLine, cursorLineIndex)
        //     });
    };
    Provider.prototype.provideCompletionItemsFromAst = function (src, position, filePath, meta, currentLine, cursorLineIndex) {
        var _this = this;
        console.log('Starting provideCompletionItemsFromAst');
        var completions = [];
        var trimmedLine = currentLine.trim();
        var position1Based = {
            line: position.line + 1,
            character: position.character
        };
        debugger;
        var path = postcss_ast_utils_1.pathFromPosition(meta.rawAst, position1Based);
        var posInSrc = postcss_ast_utils_1.getPositionInSrc(src, position);
        var lastChar = src.charAt(posInSrc);
        var lastPart = path[path.length - 1];
        var prevPart = path[path.length - 2];
        var lastSelector = prevPart && postcss_ast_utils_1.isSelector(prevPart) ? prevPart : lastPart && postcss_ast_utils_1.isSelector(lastPart) ? lastPart : null;
        if (lastSelector) {
            var lastRule = lastSelector;
            if (lastChar === '-' || isSpacy(lastChar) || lastChar == "{") {
                if (lastRule.selector === ':import') {
                    completions.push.apply(completions, getNewCompletions({
                        "-st-from": fromDirective,
                        "-st-default": defaultDirective,
                        "-st-named": namedDirective
                    }, lastRule));
                }
                else {
                    var declarationBlockDirectives = {
                        '-st-mixin': mixinDirective
                    };
                    if (lastRule.isSimpleSelector) {
                        declarationBlockDirectives["-st-extends"] = extendsDirective;
                        declarationBlockDirectives["-st-variant"] = variantDirective;
                        declarationBlockDirectives["-st-states"] = statesDirective;
                    }
                    completions.push.apply(completions, getNewCompletions(declarationBlockDirectives, lastRule));
                }
            }
            else if (meta && lastChar == ":" && trimmedLine.split(':').length === 2) {
                if (trimmedLine.indexOf('-st-extends:') === 0) {
                    meta.imports.forEach(function (importJson) {
                        if (importJson.from.lastIndexOf('.css') === importJson.from.length - 4 && importJson.defaultExport) {
                            completions.push(extendCompletion(importJson.defaultExport));
                        }
                    });
                }
                else if (trimmedLine.indexOf('-st-from:') === 0) {
                    this.resolver.docs.keys().forEach(function (k) { return completions.push(fileNameCompletion(k)); });
                }
            }
        }
        if (trimmedLine.length < 2) {
            if ((lastChar === ':' || isSpacy(lastChar)) && lastPart.type === 'root') {
                completions.push(importsDirective(new ProviderRange(new ProviderPosition(position.line, Math.max(0, position.character - 1)), position)));
            }
            if (lastChar === '.' || isSpacy(lastChar)) {
                completions.push(rootClass);
                addExistingClasses(meta, completions);
            }
        }
        else if (lastChar === ':' && meta !== undefined) {
            var selectorRes = selector_analyzer_1.parseSelector(currentLine, cursorLineIndex); //position.character);
            var focusChunk_1 = selectorRes.target.focusChunk;
            if (!Array.isArray(focusChunk_1) && selector_analyzer_1.isSelectorChunk(focusChunk_1)) {
                focusChunk_1.classes.forEach(function (className) {
                    console.log('className: ', className);
                    // const clsDef = getDefinition(meta, className, this.resolver)
                    // if (isClassDefinition(clsDef)) {
                    //     clsDef.states.forEach((stateDef) => {
                    //         if (focusChunk.states.indexOf(stateDef.name) !== -1) { return }
                    //         // const from = 'from: ' + stateDef.from;
                    //         completions.push(stateCompletion(stateDef.name, stateDef.from, position))
                    //     })
                    // }
                    var extendResolution = _this.resolver.resolveExtends(meta, className);
                    var states = [];
                    extendResolution.forEach(function (s) {
                        if (s.symbol._kind === 'class') {
                            states.push.apply(states, s.symbol[stylable_1.valueMapping.states].map(function (name) { return ({ name: name, from: s.meta.source }); }));
                        }
                    });
                    states.forEach(function (stateDef) {
                        if (focusChunk_1.states.indexOf(stateDef.name) !== -1) {
                            return;
                        }
                        completions.push(stateCompletion(stateDef.name, stateDef.from, position));
                    });
                });
            }
        }
        return Promise.resolve(completions);
    };
    return Provider;
}());
exports.default = Provider;
// function getSelectorFromPosition(src: string, index: number) {}
function getNewCompletions(completionMap, ruleset) {
    ruleset.nodes.forEach(function (node) {
        var dec = node;
        if (completionMap[dec.prop]) {
            delete completionMap[dec.prop];
        }
    });
    return Object.keys(completionMap).map(function (name) { return completionMap[name]; });
}
//# sourceMappingURL=provider.js.map