import { describe, expect, it } from 'vitest';
import type { ProjectEnvelope } from './project-contract';
import {
    createProjectDirtyState,
    markProjectChanged,
    markProjectSaved,
    parseProjectEnvelope,
    projectRevision,
    seasonReferenceFromPackage,
    serializeProjectEnvelope
} from './project-contract';

const project: ProjectEnvelope = {
    format: 'lego-spike-project',
    version: 1,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    season: {
        reference: { id: 'bioglow', name: 'BIOGLOW', edition: 'Founders Edition' },
        status: 'selected'
    },
    scene: {
        version: 2,
        world: {
            gravityMps2: { x: 0, y: -9.81, z: 0 },
            fixedTimeStep: 1 / 120,
            encoderMode: 'command'
        },
        robot: {
            id: '#robot',
            anchored: false,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            name: '#robot',
            physics: { bodyType: 'dynamic', colliders: [] }
        },
        matWidth: 2360,
        matHeight: 1140,
        objects: [],
        joints: []
    },
    robotSetup: { archiveEntry: 'robot.mpd', ports: [], wheels: [] },
    program: {
        format: 'blockly-serialization',
        available: false,
        restoreSupported: false,
        note: 'No workspace supplied.'
    },
    participantSettings: {
        simulation: { stepTimeMs: 0, startDelayMs: 1000, timeScale: 1, encoderMode: 'command' },
        display: {
            boundaryScale: 1,
            drawBoundary: true,
            showBoundaryCollisions: true,
            showPhysicsDebug: false
        }
    },
    assets: {
        sceneEntry: 'scene.json',
        robotEntry: 'robot.mpd',
        modelEntries: [],
        legacyExportsPreserved: true
    },
    capabilities: {
        sceneRestore: true,
        robotSetupRestore: true,
        programRestore: false,
        seasonRestore: false,
        binaryAssetsInArchive: true
    }
};

describe('project persistence contract', () => {
    it('round-trips the serializable envelope and retains capability limits', () => {
        const parsed = parseProjectEnvelope(serializeProjectEnvelope(project));
        expect(parsed).toEqual(project);
        expect(parsed.capabilities.seasonRestore).toBe(false);
        expect(parsed.program.restoreSupported).toBe(false);
    });

    it('tracks saved, changed, and reload boundaries', () => {
        const saved = markProjectSaved(project);
        expect(saved.dirty).toBe(false);
        const changed = markProjectChanged({ ...project, updatedAt: 'later' }, saved.savedRevision);
        expect(changed.dirty).toBe(true);
        expect(changed.reloadBoundary).toBe('before-run');
        expect(createProjectDirtyState(project, saved.savedRevision).reloadBoundary).toBe(
            'after-load'
        );
    });

    it('produces stable revisions independent of object key order', () => {
        expect(projectRevision({ a: 1, b: { c: true } })).toBe(
            projectRevision({ b: { c: true }, a: 1 })
        );
    });

    it('stores explicit identity from a selected season package', () => {
        expect(
            seasonReferenceFromPackage({
                schemaVersion: 1,
                id: 'bioglow-founders-2026-27',
                name: 'BIOGLOW',
                edition: 'Founders Edition',
                revision: 'catalog-1',
                platform: 'SPIKE Prime'
            })
        ).toEqual({
            schemaVersion: 1,
            id: 'bioglow-founders-2026-27',
            name: 'BIOGLOW',
            edition: 'Founders Edition',
            revision: 'catalog-1',
            platform: 'SPIKE Prime'
        });
    });

    it('rejects unsupported or malformed envelopes', () => {
        expect(() => parseProjectEnvelope('{"format":"other","version":1}')).toThrow(
            'Unsupported project format'
        );
        expect(() => parseProjectEnvelope(JSON.stringify({ ...project, version: 2 }))).toThrow(
            'Unsupported project version'
        );
    });
});
