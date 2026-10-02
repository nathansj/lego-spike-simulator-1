import { describe, expect, it } from 'vitest';
import { commandText, prettifyBlockType } from './command-labels';

describe('prettifyBlockType', () => {
    it('strips flipper prefixes and splits camel case', () => {
        expect(prettifyBlockType('flippermotor_motorTurnForDirection')).toBe(
            'Motor Turn For Direction'
        );
    });

    it('strips base prefixes', () => {
        expect(prettifyBlockType('control_repeat')).toBe('Repeat');
    });
});

describe('commandText', () => {
    it('uses the raw on-block text', () => {
        expect(commandText({ kind: 'block', type: 'flippermotor_motorTurnForDirection' })).toBe(
            'run for'
        );
    });

    it('keeps literal percent signs', () => {
        expect(commandText({ kind: 'block', type: 'flippermotor_motorSetSpeed' })).toBe(
            'set speed to %'
        );
    });

    it('uses button text for flyout buttons', () => {
        expect(commandText({ kind: 'button', text: 'Make a Variable' })).toBe('Make a Variable');
    });

    it('falls back to the variable name when the block text is empty', () => {
        expect(
            commandText({
                kind: 'block',
                type: 'data_variable',
                fields: { VARIABLE: { name: 'count' } }
            })
        ).toBe('count');
    });

    it('uses the procedure name for procedure calls', () => {
        expect(
            commandText({ kind: 'block', type: 'procedures_call', extraState: { name: 'Drive' } })
        ).toBe('Drive');
    });
});
