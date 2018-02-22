/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import * as path from "path";
// var fs = require("fs");
var _options = {locale: undefined, cacheLanguageResolution: true};
var _isPseudo = false;
var _resolvedLanguage = null;
var toString = Object.prototype.toString;

function isDefined(value) {
    return typeof value !== 'undefined';
}

function isNumber(value) {
    return toString.call(value) === '[object Number]';
}

function isString(value) {
    return toString.call(value) === '[object String]';
}

function isBoolean(value) {
    return value === true || value === false;
}

function format(message, args) {
    var result;
    if (_isPseudo) {
        // FF3B and FF3D is the Unicode zenkaku representation for [ and ]
        message = '\uFF3B' + message.replace(/[aouei]/g, '$&$&') + '\uFF3D';
    }
    if (args.length === 0) {
        result = message;
    }
    else {
        result = message.replace(/\{(\d+)\}/g, function (match, rest) {
            var index = rest[0];
            return typeof args[index] !== 'undefined' ? args[index] : match;
        });
    }
    return result;
}

function createScopedLocalizeFunction(messages) {
    return function (key, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (isNumber(key)) {
            if (key >= messages.length) {
                console.error("Broken localize call found. Index out of bounds. Stacktrace is\n: " + new Error('').stack);
                return;
            }
            return format(messages[key], args);
        }
        else {
            if (isString(message)) {
                console.warn("Message " + message + " didn't get externalized correctly.");
                return format(message, args);
            }
            else {
                console.error("Broken localize call found. Stacktrace is\n: " + new Error('').stack);
            }
        }
    };
}

function localize(key, message) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    return format(message, args);
}

function resolveLanguage(file) {
    var ext = path.extname(file);
    if (ext) {
        file = file.substr(0, file.length - ext.length);
    }
    var resolvedLanguage;
    if (_options.cacheLanguageResolution && _resolvedLanguage) {
        resolvedLanguage = _resolvedLanguage;
    }
    else {
        if (_isPseudo || !_options.locale) {
            resolvedLanguage = '.nls.json';
        }
        else {
            var locale = _options.locale;
            while (locale) {
                var candidate = '.nls.' + locale + '.json';
                if (true) {//fs.existsSync(file + candidate) //
                    resolvedLanguage = candidate;
                    break;
                }
                // else {
                //     var index = locale.lastIndexOf('-');
                //     if (index > 0) {
                //         locale = locale.substring(0, index);
                //     }
                //     else {
                //         resolvedLanguage = '.nls.json';
                //         locale = null;
                //     }
                // }
            }
        }
        if (_options.cacheLanguageResolution) {
            _resolvedLanguage = resolvedLanguage;
        }
    }
    return file + resolvedLanguage;
}

function loadMessageBundle(file) {
    if (!file) {
        return localize;
    }
    else {
        var resolvedFile = resolveLanguage(file);
        try {
            var json = {};//require(resolvedFile);
            if (Array.isArray(json)) {
                return createScopedLocalizeFunction(json);
            }
            else {
                if (isDefined(json.messages) && isDefined(json.keys)) {
                    return createScopedLocalizeFunction(json.messages);
                }
                else {
                    console.error("String bundle '" + file + "' uses an unsupported format.");
                    return localize;
                }
            }
        }
        catch (e) {
            console.error("Can't load string bundle for " + file);
            return localize;
        }
    }
}

export {loadMessageBundle};

function config(opt) {
    var options;
    if (isString(opt)) {
        try {
            options = JSON.parse(opt);
        }
        catch (e) {
            console.error("Error parsing nls options: " + opt);
        }
    }
    else {
        options = opt;
    }
    if (options) {
        if (isString(options.locale)) {
            _options.locale = options.locale.toLowerCase();
            _resolvedLanguage = null;
        }
        if (isBoolean(options.cacheLanguageResolution)) {
            _options.cacheLanguageResolution = options.cacheLanguageResolution;
        }
    }
    _isPseudo = _options.locale === 'pseudo';
    return loadMessageBundle;
}

export {config};
//# sourceMappingURL=main.js.map
