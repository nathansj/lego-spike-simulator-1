import { describe, expect, it } from 'vitest';
import { parseRobotArchiveEntry, ROBOT_ARCHIVE_ENTRY } from './robot-archive';

describe('robot archive entry', () => {
    it('uses a dedicated MPD entry', () => {
        expect(ROBOT_ARCHIVE_ENTRY).toBe('robot.mpd');
    });

    it('accepts MPD geometry emitted by robot persistence', () => {
        const content = [
            '0 FILE main.ldr',
            '0 Name: main.ldr',
            '1 16 0 0 0 1 0 0 0 1 0 0 0 1 45678.dat',
            ''
        ].join('\r\n');

        expect(parseRobotArchiveEntry(content)).toBe(content);
    });

    it('rejects malformed entries before robot state is changed', () => {
        expect(() => parseRobotArchiveEntry('1 16 0 0 0')).toThrow('Invalid robot archive');
        expect(() => parseRobotArchiveEntry('0 FILE\n')).toThrow('Missing MPD filename');
        expect(() =>
            parseRobotArchiveEntry('0 FILE main.ldr\n1 16 x 0 0 1 0 0 0 1 0 0 0 1 45678.dat')
        ).toThrow('Invalid robot archive number');
    });
});
