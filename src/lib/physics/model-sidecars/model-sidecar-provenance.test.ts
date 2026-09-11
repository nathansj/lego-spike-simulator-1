import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    findBundledModelPhysics,
    type ModelPhysicsSidecar
} from '$lib/physics/articulation-presets';

interface AssetProvenance {
    version: 1;
    sourceCollection: 'FLL_Bioglow';
    sourcePath: string;
    sha256: string;
    byteLength: number;
    lineCount: number;
    mpd: {
        rootFile: string;
        embeddedFileCount: number;
        rootType1ReferenceCount: number;
    };
    verifiedOn: string;
    verification: {
        fileIdentity: 'verified';
        geometryInterpretation: 'unverified';
        mechanicsCalibration: 'uncalibrated';
    };
}

type ProvenancedSidecar = ModelPhysicsSidecar & { assetProvenance: AssetProvenance };

const sourceCollectionRoot = '/Users/Sheldon/data/projects/sourcecode/FLL_Bioglow';
const missionModelNames = Array.from(
    { length: 13 },
    (_, index) => `45832_${String(index + 1).padStart(2, '0')}.mpd`
);

function getSidecar(modelName: string): ProvenancedSidecar {
    return findBundledModelPhysics(modelName) as ProvenancedSidecar;
}

function countLines(content: string): number {
    return content.match(/\n/g)?.length ?? 0;
}

async function sha256(content: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
        ''
    );
}

function readMpdStructure(content: string) {
    let rootFile = '';
    let embeddedFileCount = 0;
    let rootType1ReferenceCount = 0;
    let insideRootFile = false;

    for (const rawLine of content.split(/\r?\n/)) {
        const fileMatch = /^0 FILE (.+)$/.exec(rawLine);
        if (fileMatch) {
            embeddedFileCount += 1;
            if (embeddedFileCount === 1) {
                rootFile = fileMatch[1];
                insideRootFile = true;
            }
            continue;
        }
        if (insideRootFile && rawLine === '0 NOFILE') {
            insideRootFile = false;
            continue;
        }
        if (insideRootFile && /^\s*1\s+/.test(rawLine)) {
            rootType1ReferenceCount += 1;
        }
    }

    return { rootFile, embeddedFileCount, rootType1ReferenceCount };
}

describe('BIOGLOW model sidecar provenance', () => {
    it('records a versioned, explicitly uncalibrated evidence boundary for every sidecar', () => {
        for (const modelName of missionModelNames) {
            const sidecar = getSidecar(modelName);
            expect(sidecar.assetProvenance).toMatchObject({
                version: 1,
                sourceCollection: 'FLL_Bioglow',
                sourcePath: `models/complete/ldraw/${modelName}`,
                verifiedOn: '2026-09-11',
                verification: {
                    fileIdentity: 'verified',
                    geometryInterpretation: 'unverified',
                    mechanicsCalibration: 'uncalibrated'
                }
            });
            expect(sidecar.assetProvenance.sha256).toMatch(/^[0-9a-f]{64}$/);
            expect(sidecar.assetProvenance.byteLength).toBeGreaterThan(0);
            expect(sidecar.assetProvenance.lineCount).toBeGreaterThan(0);
            expect(sidecar.assetProvenance.mpd.rootFile.trim()).not.toBe('');
            expect(sidecar.assetProvenance.mpd.embeddedFileCount).toBeGreaterThan(0);
            expect(sidecar.assetProvenance.mpd.rootType1ReferenceCount).toBeGreaterThan(0);
        }
    });

    it.skipIf(!existsSync(sourceCollectionRoot))(
        'matches every recorded identity and MPD structure fact to the supplied source files',
        async () => {
            for (const modelName of missionModelNames) {
                const provenance = getSidecar(modelName).assetProvenance;
                const sourcePath = `${sourceCollectionRoot}/${provenance.sourcePath}`;
                const content = readFileSync(sourcePath, 'utf8');

                expect(await sha256(content)).toBe(provenance.sha256);
                expect(new TextEncoder().encode(content).byteLength).toBe(provenance.byteLength);
                expect(countLines(content)).toBe(provenance.lineCount);
                expect(readMpdStructure(content)).toEqual(provenance.mpd);
            }
        }
    );
});
