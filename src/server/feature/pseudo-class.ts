import { StylableMeta, ParsedValue, systemValidators, StateParsedValue } from 'stylable';
import { ProviderPosition } from '../completion-providers';
import {
    ParameterInformation,
    SignatureHelp,
    SignatureInformation
} from 'vscode-languageserver';
import { ParsedFuncOrDivValue } from '../types';

const pvp = require('postcss-value-parser');

export function resolveStateTypeOrValidator(meta: StylableMeta, pos: ProviderPosition, line: string): string | boolean | null {
    const valueStartChar = line.indexOf(':') + 1;
    const value = line.slice(valueStartChar);
    const stateParts = pvp(value).nodes;
    let requiredHinting: boolean = false;
    let validator = { length: 0, requiredHinting: false };
    let stateTypeValidatorToHint: string | null = null;

    if (stateParts.some(isParsedNodeFunction)) {
        let length = valueStartChar;

        for (let statePart of stateParts) {
            length += statePart.value.length;

            if (isParsedNodeFunction(statePart)) {
                const stateNodes = statePart.nodes;
                length++; // opening state parenthesis

                ({length, requiredHinting} = resolvePosInState(pos.character, length, statePart.before));
                if (requiredHinting || stateTypeValidatorToHint) {
                    continue;
                }

                ({ length, requiredHinting, stateTypeValidatorToHint } = resolveStateType(stateNodes, length, requiredHinting, pos, validator, stateTypeValidatorToHint));

                if (requiredHinting || stateTypeValidatorToHint) {
                    continue;
                } else {
                    ({length, requiredHinting} = resolvePosInState(pos.character, length, statePart.after));
                }

                length++; // closing state parenthesis
            } else if (isParsedNodeDiv(statePart)) {
                length = length + statePart.before.length + statePart.after.length;
            }
        }
        if (stateTypeValidatorToHint) {
            return stateTypeValidatorToHint;
        } else if (requiredHinting) {
            return requiredHinting;
        }
    }

    return null;
}

function resolveStateType(stateNodes: any, length: number, requiredHinting: boolean, pos: ProviderPosition, validator: { length: number; requiredHinting: boolean; }, stateTypeValidatorToHint: string | null) {
    for (let typeNode of stateNodes) {
        // stateNodes.forEach((typeNode: ParsedValue) => {
        ({ length, requiredHinting } = resolvePosInState(pos.character, length, typeNode.value));
        if (!requiredHinting && isParsedNodeFunction(typeNode)) {
            length++; // opening type parenthesis
            validator = resolvePosInState(pos.character, length, typeNode.before);
            stateTypeValidatorToHint = isValidatorsHintingRequired(validator.requiredHinting, stateTypeValidatorToHint, typeNode.value);
            length = validator.length;
            typeNode.nodes.forEach((valNode: ParsedValue) => {
                ({ validator, length, stateTypeValidatorToHint } = resolveStateValidator(pos, length, valNode, stateTypeValidatorToHint, typeNode));
            });
            validator = resolvePosInState(pos.character, length, typeNode.after);
            stateTypeValidatorToHint = isValidatorsHintingRequired(validator.requiredHinting, stateTypeValidatorToHint, typeNode.value);
            length = validator.length;
            length++; // closing type parenthesis
        }
    }

    return { length, requiredHinting, stateTypeValidatorToHint };
}

function resolveStateValidator(pos: ProviderPosition, length: number, valNode: ParsedValue, stateTypeValidatorToHint: string | null, typeNode: any) {
    let validator = resolvePosInState(pos.character, length, valNode.value);
    stateTypeValidatorToHint = isValidatorsHintingRequired(validator.requiredHinting, stateTypeValidatorToHint, typeNode.value);
    if (isParsedNodeFunction(valNode)) {
        length++; // opening arg parenthesis
        const argsLength = valNode.nodes.reduce((sum: number, node: any) => {
            const quotes = (node.quote && 2) || 0;
            const before = node.before && node.before.length || 0;
            const after = node.after && node.after.length || 0;
            return sum + node.value.length + before + after + quotes;
        }, 0);
        length = validator.length + argsLength;
        length++; // closing arg parenthesis
    }
    return { validator, length, stateTypeValidatorToHint };
}

function isValidatorsHintingRequired(requiredHinting: boolean, stateTypeValidatorToHint: string | null, type: string) {
    if (requiredHinting) {
        stateTypeValidatorToHint = type;
    }
    return stateTypeValidatorToHint;
}

export function createStateValidatorSignature(type: string) {
    const valiadtors = systemValidators[type].subValidators;

    if (valiadtors) {
        const validatorsString = Object.keys(valiadtors).join(', ');
        const sigInfo: SignatureInformation = {
            label: `Supported "${type}" validator types:\n- "${validatorsString}"`,
            parameters: [{label: validatorsString}] as ParameterInformation[]
        };

        return {
            activeParameter: 0,
            activeSignature: 0,
            signatures: [sigInfo]
        } as SignatureHelp;
    } else {
        return null;
    }
}


export function createStateTypeSignature() {
    const stateTypes = Object.keys(systemValidators).join(' | ');
    const sigInfo: SignatureInformation = {
        label: `Supported state types:\n- "${stateTypes}"`,
        parameters: [{label: stateTypes}] as ParameterInformation[]
    };
    return {
        activeParameter: 0,
        activeSignature: 0,
        signatures: [sigInfo]
    } as SignatureHelp;
}

function resolvePosInState(character: number, length: number, arg: string) {
    let requiredHinting = false;

    if (isBetweenLengths(character, length, arg)) {
        requiredHinting = true;
    }
    length = length + arg.length;

    return {length, requiredHinting};
}

export function isParsedNodeFunction(node: ParsedValue): node is ParsedFuncOrDivValue {
    return node.type === 'function';
}

export function isParsedNodeDiv(node: ParsedValue): node is ParsedFuncOrDivValue {
    return node.type === 'div';
}

export function isBetweenLengths(location: number, length: number, modifier: { length: number }) {
    return location >= length && ( location <= length + modifier.length );
}

export function resolveStateParams(stateDef: StateParsedValue) {
    const typeArguments: string[] = [];
    if (stateDef.arguments.length > 0) {
        stateDef.arguments.forEach((arg) => {
            if (typeof arg === 'object') {
                if (arg.args.length > 0) {
                    typeArguments.push(`${arg.name}(${arg.args.join(', ')})`);
                }
            }
            else if (typeof arg === 'string') {
                typeArguments.push(arg);
            }
        });
    }
    const parameters = typeArguments.length > 0 ? `${stateDef.type}(${typeArguments.join(', ')})` : stateDef.type;
    return parameters;
}
