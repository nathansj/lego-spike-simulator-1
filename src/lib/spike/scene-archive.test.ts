import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { legacySceneObjectArchiveEntry, sceneObjectArchiveEntry } from './scene-archive';

describe('scene archive entries', () => {
    it('keeps geometry distinct for objects with duplicate display names', async () => {
        const zip = new JSZip();
        zip.file(sceneObjectArchiveEntry('mission-a'), 'first geometry');
        zip.file(sceneObjectArchiveEntry('mission-b'), 'second geometry');

        const archive = await zip.generateAsync({ type: 'uint8array' });
        const loaded = await JSZip.loadAsync(archive);

        await expect(
            loaded.file(sceneObjectArchiveEntry('mission-a'))!.async('string')
        ).resolves.toBe('first geometry');
        await expect(
            loaded.file(sceneObjectArchiveEntry('mission-b'))!.async('string')
        ).resolves.toBe('second geometry');
    });

    it('reads display-name entries used by legacy archives', async () => {
        const zip = new JSZip();
        zip.file(legacySceneObjectArchiveEntry('Mission model'), 'legacy geometry');

        const archive = await zip.generateAsync({ type: 'uint8array' });
        const loaded = await JSZip.loadAsync(archive);
        const objectFile =
            loaded.file(sceneObjectArchiveEntry('mission-id')) ??
            loaded.file(legacySceneObjectArchiveEntry('Mission model'));

        await expect(objectFile!.async('string')).resolves.toBe('legacy geometry');
    });
});
