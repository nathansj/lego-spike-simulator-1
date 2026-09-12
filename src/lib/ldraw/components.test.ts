import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { loadModel, resolveFromZip } from '$lib/ldraw/components';

async function libraryZip(partName: string): Promise<Uint8Array> {
    const zip = new JSZip();
    zip.file(`parts/${partName}`, `0 ${partName}\n`);
    return zip.generateAsync({ type: 'uint8array' });
}

describe('LDraw library loading', () => {
    it('serializes concurrent ZIP loads so later archives resolve remaining parts', async () => {
        const firstPart = 'codex-queue-first.dat';
        const secondPart = 'codex-queue-second.dat';
        const model = loadModel(
            'codex-queue-test.mpd',
            [
                '0 FILE codex-queue-test.ldr',
                `1 16 0 0 0 1 0 0 0 1 0 0 0 1 ${firstPart}`,
                `1 16 10 0 0 1 0 0 0 1 0 0 0 1 ${secondPart}`
            ].join('\n')
        );

        await Promise.all([
            resolveFromZip(await libraryZip(firstPart)),
            resolveFromZip(await libraryZip(secondPart))
        ]);

        expect(model.subparts.every(({ model: resolvedModel }) => resolvedModel !== undefined)).toBe(
            true
        );
    });
});
