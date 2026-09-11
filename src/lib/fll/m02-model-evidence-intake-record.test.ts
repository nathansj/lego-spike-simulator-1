import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    BIOGLOW_EXTERNAL_MPD_INVENTORY,
    BIOGLOW_EXTERNAL_MPD_SOURCE_DIRECTORY,
    findBioglowExternalMpdAsset
} from '$lib/fll/bioglow-external-mpd-inventory';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';
import { M02_MODEL_EVIDENCE_INTAKE_RECORD } from '$lib/fll/m02-model-evidence-intake-record';

const allSuppliedMpdsAreAvailable = BIOGLOW_EXTERNAL_MPD_INVENTORY.every(({ localSourcePath }) =>
    existsSync(localSourcePath)
);

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
    const embeddedFiles = Array.from(content.matchAll(/^0 FILE (.+)$/gm), (match) => match[1]);
    const rootEmbeddedSubmodelReferences: string[] = [];
    const declaredBrickCounts: { file: string; count: number }[] = [];
    let currentFile = '';
    let rootType1ReferenceCount = 0;

    for (const line of content.split(/\r?\n/)) {
        const fileMatch = /^0 FILE (.+)$/.exec(line);
        if (fileMatch) {
            currentFile = fileMatch[1];
            continue;
        }

        const brickCountMatch = /^0 NumOfBricks (\d+)$/.exec(line);
        if (brickCountMatch) {
            declaredBrickCounts.push({ file: currentFile, count: Number(brickCountMatch[1]) });
            continue;
        }

        if (currentFile === embeddedFiles[0] && /^1\s+/.test(line)) {
            rootType1ReferenceCount += 1;
            const referenceName = line.trim().split(/\s+/).slice(14).join(' ');
            if (embeddedFiles.some((file) => file.toLowerCase() === referenceName.toLowerCase())) {
                rootEmbeddedSubmodelReferences.push(referenceName);
            }
        }
    }

    return {
        rootFile: embeddedFiles[0],
        embeddedFileCount: embeddedFiles.length,
        embeddedFiles,
        rootType1ReferenceCount,
        rootEmbeddedSubmodelReferences,
        declaredBrickCounts
    };
}

describe('M02 model evidence intake record', () => {
    it('selects M02 from the complete M01-M13 provenance inventory', () => {
        const record = M02_MODEL_EVIDENCE_INTAKE_RECORD;

        expect(record.suppliedCollection.sourceDirectory).toBe(
            BIOGLOW_EXTERNAL_MPD_SOURCE_DIRECTORY
        );
        expect(record.suppliedCollection.inventoriedAssetCount).toBe(13);
        expect(record.suppliedCollection.inventoriedMissionIds).toEqual(
            Array.from({ length: 13 }, (_, index) => `M${String(index + 1).padStart(2, '0')}`)
        );
        expect(record.suppliedCollection.inventoriedFileNames).toEqual(
            Array.from(
                { length: 13 },
                (_, index) => `45832_${String(index + 1).padStart(2, '0')}.mpd`
            )
        );
        expect(record.suppliedMpdEvidence.identity).toMatchObject({
            missionId: 'M02',
            fileName: '45832_02.mpd',
            integrity: {
                algorithm: 'sha256',
                value: '5a90dcf1916bdd8e9fdc06e1835bdbb3edb941726319416ec8f306b74dc1486f',
                sizeBytes: 26172
            }
        });
    });

    it.skipIf(!allSuppliedMpdsAreAvailable)(
        'rechecks all 13 supplied files and derives the recorded M02 MPD facts',
        async () => {
            for (const asset of BIOGLOW_EXTERNAL_MPD_INVENTORY) {
                const content = readFileSync(asset.localSourcePath, 'utf8');
                expect(content).toMatch(/^0 FILE /);
                expect(await sha256(content)).toBe(asset.integrity.value);
                expect(new TextEncoder().encode(content).byteLength).toBe(
                    asset.integrity.sizeBytes
                );
            }

            const m02Asset = findBioglowExternalMpdAsset('45832_02.mpd');
            expect(m02Asset).toBeDefined();
            const content = readFileSync(m02Asset!.localSourcePath, 'utf8');
            const structure = readMpdStructure(content);
            const recordedStructure =
                M02_MODEL_EVIDENCE_INTAKE_RECORD.suppliedMpdEvidence.structure;

            expect(countLines(content)).toBe(recordedStructure.lineCount);
            expect(structure).toEqual({
                rootFile: recordedStructure.rootFile,
                embeddedFileCount: recordedStructure.embeddedFileCount,
                embeddedFiles: [...recordedStructure.embeddedFiles],
                rootType1ReferenceCount: recordedStructure.rootType1ReferenceCount,
                rootEmbeddedSubmodelReferences: [
                    ...recordedStructure.rootEmbeddedSubmodelReferences
                ],
                declaredBrickCounts: [...recordedStructure.declaredBrickCounts]
            });
            expect(content).toContain(
                `0 // Source: ${M02_MODEL_EVIDENCE_INTAKE_RECORD.suppliedMpdEvidence.headerDeclarations.geometrySource}`
            );
            expect(content).toContain(
                `0 // ${M02_MODEL_EVIDENCE_INTAKE_RECORD.suppliedMpdEvidence.headerDeclarations.crossCheck}`
            );
            expect(content).not.toMatch(/\b(seed|stalk)\b/i);
        }
    );

    it('uses only the existing official source record for mission-rule facts', () => {
        const evidence = M02_MODEL_EVIDENCE_INTAKE_RECORD.officialMissionEvidence;

        expect(M02_MODEL_EVIDENCE_INTAKE_RECORD.mission).toBe(
            M02_EXPLODING_SEEDS_SOURCE_RECORD.mission
        );
        expect(evidence.missionModelInstructions).toBe(
            M02_EXPLODING_SEEDS_SOURCE_RECORD.sources.missionModelInstructions
        );
        expect(evidence.scoring).toBe(M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoring);
        expect(evidence.scoredSeedCount).toBe(
            M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoredSeedCount
        );
        expect(evidence.evaluationTiming).toBe(
            M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.evaluationTiming
        );
        expect(evidence.equipmentConstraint).toBe(
            M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.equipmentConstraint
        );
    });

    it('keeps video review, physical measurement, semantics, and mechanics unresolved', () => {
        const record = M02_MODEL_EVIDENCE_INTAKE_RECORD;

        expect(record.suppliedMpdEvidence.structure.missionSemanticLabels.status).toBe('absent');
        expect(record.unresolvedEvidence.videoReview.status).toBe('unresolved-not-reviewed');
        expect(record.unresolvedEvidence.physicalMeasurement.status).toBe(
            'unresolved-not-measured'
        );
        expect(record.unresolvedEvidence.physicalMeasurement.requiredMeasurements).toHaveLength(5);
        expect(record.unresolvedEvidence.semanticIdentity.status).toBe('unresolved');
        expect(record.unresolvedEvidence.coordinateRegistration.status).toBe('unresolved');
        expect(record.unresolvedEvidence.mechanics.status).toBe('unresolved');
        expect(record.admission.status).toBe('evidence-intake-only');
        expect(record.admission.blocks).toContain('Physics');
    });
});
