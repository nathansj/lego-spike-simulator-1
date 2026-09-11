import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { M02_EXPLODING_SEEDS_ASSET_AVAILABILITY_RECORD } from '$lib/fll/m02-asset-availability-record';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

describe('M02 Exploding Seeds asset availability record', () => {
    it('pins official asset-related references without presenting them as simulator geometry', () => {
        const record = M02_EXPLODING_SEEDS_ASSET_AVAILABILITY_RECORD;

        expect(record.mission).toBe(M02_EXPLODING_SEEDS_SOURCE_RECORD.mission);
        expect(record.officialReferences.englishModelBuildingInstructions).toMatchObject({
            status: 'verified-document-link',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-bi-enus-book-02.pdf',
            locator: 'Model 2 English building-instruction PDF, 15 pages'
        });
        expect(
            Object.values(record.officialReferences).every(({ url }) => url.startsWith('https://'))
        ).toBe(true);
        expect(record.scope.excludes).toContain('simulator geometry');
    });

    it('records the current checkout as a placeholder sidecar without a root model asset', () => {
        const { repositorySnapshot } = M02_EXPLODING_SEEDS_ASSET_AVAILABILITY_RECORD;

        expect(repositorySnapshot.placeholderSidecar.status).toBe('present-unadmitted');
        expect(existsSync(repositorySnapshot.placeholderSidecar.path)).toBe(true);
        expect(repositorySnapshot.rootModelAsset.status).toBe('absent-from-checkout');
        expect(existsSync(repositorySnapshot.rootModelAsset.expectedRepositoryPath)).toBe(false);
        expect(repositorySnapshot.dependencyManifest.status).toBe('root-name-only');
        expect(existsSync(repositorySnapshot.dependencyManifest.path)).toBe(true);
    });

    it('blocks a semantic manifest until reproducible asset and placement evidence exists', () => {
        const record = M02_EXPLODING_SEEDS_ASSET_AVAILABILITY_RECORD;

        expect(record.semanticIdentityAdmission.status).toBe('not-admissible');
        expect(record.nextRequiredArtifact.id).toBe('m02-model-asset-intake');
        expect(record.nextRequiredArtifact.requiredEvidence).toHaveLength(5);
        expect(record.nextRequiredArtifact.gate).toContain('semantic manifest');
    });
});
