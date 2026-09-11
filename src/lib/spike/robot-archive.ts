export const ROBOT_ARCHIVE_ENTRY = 'robot.mpd';

/**
 * Validates the MPD syntax emitted by `saveMPD` before loading can mutate robot state.
 */
export function parseRobotArchiveEntry(content: string): string {
    if (typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Invalid robot archive entry');
    }

    let fileCount = 0;
    for (const [index, sourceLine] of content.split(/\r?\n/).entries()) {
        const parts = sourceLine.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) continue;

        const type = parts[0];
        if (!/^[0-5]$/.test(type)) {
            throw new Error(`Invalid robot archive instruction on line ${index + 1}`);
        }
        if (type === '0') {
            if (parts[1]?.toUpperCase() === 'FILE') {
                if (parts.length < 3) {
                    throw new Error(`Missing MPD filename on line ${index + 1}`);
                }
                fileCount++;
            }
            continue;
        }

        const requiredLengths: Record<string, number> = {
            '1': 15,
            '2': 8,
            '3': 11,
            '4': 14,
            '5': 14
        };
        if (parts.length < requiredLengths[type] || !parts[1]) {
            throw new Error(`Invalid robot archive instruction on line ${index + 1}`);
        }
        for (const value of parts.slice(2, requiredLengths[type] - (type === '1' ? 1 : 0))) {
            if (!Number.isFinite(Number(value))) {
                throw new Error(`Invalid robot archive number on line ${index + 1}`);
            }
        }
    }

    if (fileCount === 0) {
        throw new Error('Invalid robot archive entry: expected an MPD FILE declaration');
    }
    return content;
}
