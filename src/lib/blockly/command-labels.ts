import { blocks } from '$lib/blockly/blocks';
import { procedureBlocks } from '$lib/blockly/procedure_blocks';

export interface CommandLabelItem {
    kind?: string;
    type?: string;
    text?: string;
    fields?: Record<string, unknown>;
    extraState?: unknown;
}

interface BlockDefinitionLike {
    type?: string;
    message0?: string;
}

function buildMessage0Map(definitions: BlockDefinitionLike[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const definition of definitions) {
        if (
            definition.type &&
            typeof definition.message0 === 'string' &&
            !map.has(definition.type)
        ) {
            map.set(definition.type, definition.message0);
        }
    }
    return map;
}

const message0ByType = buildMessage0Map([
    ...(blocks as unknown as BlockDefinitionLike[]),
    ...(procedureBlocks as unknown as BlockDefinitionLike[])
]);

export function prettifyBlockType(type: string): string {
    const stripped = type
        .replace(/^flipper[a-z]*_/, '')
        .replace(/^(control|event|operator|sound)_/, '');
    const spaced = stripped
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
    if (!spaced) {
        return type;
    }
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function cleanMessage0(message0: string | undefined): string {
    if (!message0) {
        return '';
    }
    return message0.replace(/%%/g, '%').replace(/%\d+/g, ' ').replace(/\s+/g, ' ').trim();
}

function readName(value: unknown): string | undefined {
    if (value && typeof value === 'object' && 'name' in value) {
        const name = (value as { name?: unknown }).name;
        if (typeof name === 'string' && name.length > 0) {
            return name;
        }
    }
    return undefined;
}

export function commandText(item: CommandLabelItem): string {
    if (item.kind === 'button') {
        return item.text ?? 'Command';
    }
    const type = item.type ?? '';
    if (type === 'procedures_call') {
        return readName(item.extraState) ?? 'My block';
    }
    const variableName = readName(item.fields?.['VARIABLE']) ?? readName(item.fields?.['LIST']);
    const text = cleanMessage0(message0ByType.get(type));
    if (text) {
        return text;
    }
    if (variableName) {
        return variableName;
    }
    return prettifyBlockType(type);
}
