import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { BlocklyState } from '$lib/blockly/state';
import {
    createProjectEnvelope,
    serializeProjectEnvelope,
    type ProjectParticipantSettings
} from '$lib/spike/project-contract';
import type { SerializedSceneV2 } from '$lib/spike/scene-schema';
import {
    M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
    serializeM01ObservationProfileArchiveEntry
} from '$lib/spike/m01-observation-profile-archive';
import { loadProjectArchive } from './project-archive';

const robotContent = [
    '0 FILE main.ldr',
    '0 Name: main.ldr',
    '1 16 0 0 0 1 0 0 0 1 0 0 0 1 45678.dat',
    ''
].join('\n');

const program: BlocklyState = {
    blocks: { languageVersion: 0, blocks: [] }
};

const participantSettings: ProjectParticipantSettings = {
    simulation: { stepTimeMs: 8.33, startDelayMs: 1000, timeScale: 1, encoderMode: 'command' },
    display: {
        boundaryScale: 1,
        drawBoundary: true,
        showBoundaryCollisions: false,
        showPhysicsDebug: false
    }
};

const scene: SerializedSceneV2 = {
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
        physics: {
            bodyType: 'dynamic',
            massKg: 0.95,
            colliders: [{ shape: 'box', sizeMm: { x: 100, y: 65, z: 100 } }]
        }
    },
    matWidth: 2360,
    matHeight: 1140,
    objects: [
        {
            id: 'mission-a',
            anchored: true,
            position: { x: 100, y: 0, z: 200 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            name: 'Mission model',
            physics: {
                bodyType: 'fixed',
                colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
            }
        }
    ],
    joints: []
};

const profile = {
    profileVersion: 1,
    missionId: 'M01',
    provenance: {
        source: 'archive test',
        sourceVersion: 'test-1',
        recordedOn: '2026-09-15'
    },
    calibration: { status: 'unverified', evidence: 'Test-only profile.' },
    geometry: {
        lidarMapFlippedRotationRelativeToMat: { x: 0, y: 1, z: 0, w: 0 },
        maximumLidarMapRotationErrorRadians: 0.1,
        surveyAreaMm: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
        scanMarkerPointOffsetMm: { x: 0, y: 0, z: 0 },
        scanMarkerOverlapMarginMm: 1
    }
} as const;

async function makeArchive(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
    const zip = new JSZip();
    for (const [name, content] of Object.entries(files)) zip.file(name, content);
    return zip.generateAsync({ type: 'uint8array' });
}

function makeProject() {
    return createProjectEnvelope({
        scene,
        robotSetup: { archiveEntry: 'robot.mpd', ports: [], wheels: [] },
        program,
        participantSettings,
        seasonReference: {
            id: 'bioglow-founders-2026-27',
            name: 'BIOGLOW',
            edition: 'Founders Edition',
            revision: 'test-1',
            platform: 'SPIKE Prime'
        },
        modelEntries: ['bricks-mission-a'],
        hasMap: true,
        now: '2026-09-15T00:00:00.000Z'
    });
}

describe('project archive loader', () => {
    it('accepts legacy numeric-string wheel fields and normalizes them', async () => {
        const project = makeProject();
        project.robotSetup.wheels = [
            {
                port: 'A',
                componentId: 20168,
                radiusMm: '44' as unknown as number,
                gearing: '-1' as unknown as number,
                positionMm: { x: '-60', y: '-76', z: '12' } as unknown as {
                    x: number;
                    y: number;
                    z: number;
                },
                direction: { x: 0, y: 0, z: 1 }
            }
        ];
        const archive = await makeArchive({
            'project.json': serializeProjectEnvelope(project),
            'scene.json': JSON.stringify(scene),
            'robot.mpd': robotContent,
            'bricks-mission-a': '0 FILE mission-a.ldr\n',
            'mat.jpg': new Uint8Array([1, 2, 3])
        });

        const loaded = await loadProjectArchive(archive);
        expect(loaded.sourceFormat).toBe('project');
        if (loaded.sourceFormat !== 'project') throw new Error('expected project payload');
        const wheel = loaded.project.robotSetup.wheels[0];
        expect(wheel.radiusMm).toBe(44);
        expect(wheel.gearing).toBe(-1);
        expect(wheel.positionMm).toEqual({ x: -60, y: -76, z: 12 });
    });

    it('loads the generated project archive shape and optional data', async () => {
        const project = makeProject();
        const archive = await makeArchive({
            'project.json': serializeProjectEnvelope(project),
            'scene.json': JSON.stringify(scene),
            'robot.mpd': robotContent,
            'bricks-mission-a': '0 FILE mission-a.ldr\n',
            'mat.jpg': new Uint8Array([1, 2, 3]),
            [M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY]:
                serializeM01ObservationProfileArchiveEntry(profile)
        });

        const loaded = await loadProjectArchive(archive);

        expect(loaded.sourceFormat).toBe('project');
        if (loaded.sourceFormat !== 'project') throw new Error('expected project payload');
        expect(loaded.project.season.reference.id).toBe('bioglow-founders-2026-27');
        expect(loaded.scene.objects[0].id).toBe('mission-a');
        expect(loaded.robot.content).toBe(robotContent);
        expect(loaded.models).toEqual([
            { objectId: 'mission-a', entry: 'bricks-mission-a', content: '0 FILE mission-a.ldr\n' }
        ]);
        expect(loaded.missingModelIds).toEqual([]);
        expect(Array.from(loaded.map ?? [])).toEqual([1, 2, 3]);
        expect(loaded.program).toEqual(program);
        expect(loaded.calibration?.m01ObservationProfile).toEqual(profile);
    });

    it('fails when a declared model entry is missing', async () => {
        const project = makeProject();
        const archive = await makeArchive({
            'project.json': serializeProjectEnvelope(project),
            'scene.json': JSON.stringify(scene),
            'robot.mpd': robotContent,
            'mat.jpg': new Uint8Array([1])
        });

        await expect(loadProjectArchive(archive)).rejects.toThrow(
            'Missing required project archive entry "bricks-mission-a"'
        );
    });

    it('fails clearly for malformed project.json', async () => {
        const archive = await makeArchive({ 'project.json': '{' });

        await expect(loadProjectArchive(archive)).rejects.toThrow(
            'Malformed project archive entry "project.json": Invalid project: malformed JSON'
        );
    });

    it('loads a legacy scene archive and falls back to display-name model entries', async () => {
        const archive = await makeArchive({
            'scene.json': JSON.stringify(scene),
            'bricks-Mission model': '0 FILE legacy.ldr\n',
            'mat.jpg': new Uint8Array([9, 8])
        });

        const loaded = await loadProjectArchive(archive);

        expect(loaded.sourceFormat).toBe('legacy-scene');
        if (loaded.sourceFormat !== 'legacy-scene') throw new Error('expected legacy payload');
        expect(loaded.models[0]).toEqual({
            objectId: 'mission-a',
            entry: 'bricks-Mission model',
            content: '0 FILE legacy.ldr\n'
        });
        expect(loaded.missingModelIds).toEqual([]);
        expect(loaded.robot).toBeUndefined();
    });

    it('keeps legacy scene archives readable when a model entry is absent', async () => {
        const archive = await makeArchive({ 'scene.json': JSON.stringify(scene) });

        const loaded = await loadProjectArchive(archive);

        expect(loaded.sourceFormat).toBe('legacy-scene');
        expect(loaded.missingModelIds).toEqual(['mission-a']);
    });
});
