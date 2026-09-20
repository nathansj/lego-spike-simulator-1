import { describe, expect, it } from 'vitest';
import { sceneFromProjectPayload } from '$lib/spike/project-restore';
import type { ProjectArchiveProjectPayload } from '$lib/spike/project-archive';
import { parseSceneDefinition } from '$lib/spike/scene-schema';

const model = {
    name: 'fixture',
    subparts: [],
    lines: [],
    triangles: [],
    quads: [],
    optionalLines: []
};

function payload(): ProjectArchiveProjectPayload {
    return {
        sourceFormat: 'project',
        project: {
            format: 'lego-spike-project',
            version: 1,
            createdAt: '2026-09-15T00:00:00.000Z',
            updatedAt: '2026-09-15T00:00:00.000Z',
            season: { reference: { id: 'test', name: 'Test season' }, status: 'selected' },
            scene: {
                version: 2,
                world: {},
                robot: {
                    id: 'robot',
                    anchored: false,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                    name: 'Robot',
                    physics: { bodyType: 'dynamic', colliders: [] }
                },
                matWidth: 2360,
                matHeight: 1140,
                objects: [
                    {
                        id: 'mission-1',
                        anchored: true,
                        position: { x: 1, y: 2, z: 3 },
                        rotation: { x: 0, y: 0, z: 0, w: 1 },
                        name: 'Mission',
                        physics: { bodyType: 'fixed', colliders: [] }
                    }
                ],
                joints: []
            },
            robotSetup: { archiveEntry: 'robot.mpd', ports: [], wheels: [] },
            program: {
                format: 'blockly-serialization',
                available: false,
                restoreSupported: false
            },
            participantSettings: {
                simulation: {
                    stepTimeMs: 0,
                    startDelayMs: 1000,
                    timeScale: 1,
                    encoderMode: 'command'
                },
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
                modelEntries: ['models/mission-1.mpd'],
                legacyExportsPreserved: true
            },
            capabilities: {
                sceneRestore: true,
                robotSetupRestore: true,
                programRestore: false,
                seasonRestore: false,
                binaryAssetsInArchive: true
            }
        },
        scene: {} as ProjectArchiveProjectPayload['scene'],
        robot: { entry: 'robot.mpd', content: 'robot' },
        models: [{ objectId: 'mission-1', entry: 'models/mission-1.mpd', content: 'mission' }],
        missingModelIds: [],
        calibration: undefined
    };
}

describe('sceneFromProjectPayload', () => {
    it('applies the archived robot, model assets, and map without losing scene metadata', () => {
        const archive = payload();
        archive.scene = parseSceneDefinition(archive.project.scene);
        const map = new Blob(['map'], { type: 'image/jpeg' });
        const loaded = sceneFromProjectPayload(archive, model, map, (name, content) => ({
            ...model,
            name: `${name}:${content}`
        }));

        expect(loaded.robot.bricks).toBe(model);
        expect(loaded.objects[0].bricks?.name).toBe('Mission:mission');
        expect(loaded.objects[0].physics?.bodyType).toBe('fixed');
        expect(loaded.map).toBe(map);
    });

    it('leaves a declared scene object without a model when its asset is absent', () => {
        const archive = payload();
        archive.scene = parseSceneDefinition(archive.project.scene);
        archive.models = [];

        const loaded = sceneFromProjectPayload(archive, model, undefined, () => model);

        expect(loaded.objects[0].bricks).toBeUndefined();
    });
});
