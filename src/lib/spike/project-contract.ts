import type { BlocklyState } from '$lib/blockly/state';
import type { SerializedSceneV2 } from '$lib/spike/scene-schema';

export const PROJECT_ARCHIVE_ENTRY = 'project.json';
export const PROJECT_FORMAT = 'lego-spike-project';
export const PROJECT_VERSION = 1;

export interface ProjectSeasonReference {
    schemaVersion?: number;
    id: string;
    name: string;
    edition?: string;
    revision?: string;
    platform?: string;
}

export interface ProjectRobotPort {
    port: string;
    type: string;
    componentId: number | 'none';
}

export interface ProjectWheelSetup {
    port: string;
    componentId: number;
    radiusMm: number;
    gearing: number;
    positionMm: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
}

export interface ProjectRobotSetup {
    archiveEntry: string;
    ports: ProjectRobotPort[];
    wheels: ProjectWheelSetup[];
}

export interface ProjectProgram {
    format: 'blockly-serialization';
    state?: BlocklyState;
    available: boolean;
    restoreSupported: boolean;
    note?: string;
}

export interface ProjectParticipantSettings {
    simulation: {
        stepTimeMs: number;
        startDelayMs: number;
        timeScale: number;
        encoderMode: 'command' | 'physical';
    };
    display: {
        boundaryScale: number;
        drawBoundary: boolean;
        showBoundaryCollisions: boolean;
        showPhysicsDebug: boolean;
    };
}

export interface ProjectAssetManifest {
    sceneEntry: 'scene.json';
    robotEntry: 'robot.mpd';
    mapEntry?: 'mat.jpg';
    modelEntries: string[];
    legacyExportsPreserved: true;
}

export interface ProjectCapabilities {
    sceneRestore: true;
    robotSetupRestore: true;
    programRestore: boolean;
    seasonRestore: boolean;
    binaryAssetsInArchive: true;
}

export interface ProjectEnvelope {
    format: typeof PROJECT_FORMAT;
    version: typeof PROJECT_VERSION;
    createdAt: string;
    updatedAt: string;
    season: {
        reference: ProjectSeasonReference;
        status: 'selected' | 'unselected' | 'unavailable';
    };
    scene: SerializedSceneV2;
    robotSetup: ProjectRobotSetup;
    program: ProjectProgram;
    participantSettings: ProjectParticipantSettings;
    assets: ProjectAssetManifest;
    capabilities: ProjectCapabilities;
}

export interface CreateProjectEnvelopeInput {
    scene: SerializedSceneV2;
    robotSetup: ProjectRobotSetup;
    program?: BlocklyState;
    participantSettings: ProjectParticipantSettings;
    seasonReference?: ProjectSeasonReference;
    modelEntries: string[];
    hasMap: boolean;
    now?: string;
}

export interface SeasonPackageIdentity {
    schemaVersion: number;
    id: string;
    name: string;
    edition: string;
    revision: string;
    platform: string;
}

export interface ProjectDirtyState {
    savedRevision: string | undefined;
    currentRevision: string;
    dirty: boolean;
    reloadBoundary: 'before-run' | 'after-load' | 'after-save';
}

export function createProjectDirtyStateFromRevision(
    currentRevision: string,
    savedRevision: string | undefined,
    reloadBoundary: ProjectDirtyState['reloadBoundary'] = 'after-load'
): ProjectDirtyState {
    return {
        savedRevision,
        currentRevision,
        dirty: savedRevision !== currentRevision,
        reloadBoundary
    };
}

export function markProjectRevisionChanged(
    currentRevision: string,
    savedRevision: string | undefined
): ProjectDirtyState {
    return createProjectDirtyStateFromRevision(currentRevision, savedRevision, 'before-run');
}

export function markProjectRevisionSaved(currentRevision: string): ProjectDirtyState {
    return createProjectDirtyStateFromRevision(currentRevision, currentRevision, 'after-save');
}

function stableJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

export function projectRevision(value: unknown): string {
    const json = stableJson(value);
    let hash = 2166136261;
    for (let index = 0; index < json.length; index++) {
        hash ^= json.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createProjectDirtyState(
    project: ProjectEnvelope,
    savedRevision?: string
): ProjectDirtyState {
    return createProjectDirtyStateFromRevision(projectRevision(project), savedRevision);
}

export function markProjectChanged(
    project: ProjectEnvelope,
    savedRevision?: string
): ProjectDirtyState {
    return markProjectRevisionChanged(projectRevision(project), savedRevision);
}

export function markProjectSaved(project: ProjectEnvelope): ProjectDirtyState {
    return markProjectRevisionSaved(projectRevision(project));
}

function requiredString(value: unknown, name: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid project: ${name} is required`);
    }
    return value;
}

export function serializeProjectEnvelope(project: ProjectEnvelope): string {
    return JSON.stringify(project, null, 2);
}

export function createProjectEnvelope(input: CreateProjectEnvelopeInput): ProjectEnvelope {
    const now = input.now ?? new Date().toISOString();
    const hasProgram = input.program !== undefined;
    return {
        format: PROJECT_FORMAT,
        version: PROJECT_VERSION,
        createdAt: now,
        updatedAt: now,
        season: {
            reference: input.seasonReference ?? { id: 'unselected', name: 'No season selected' },
            status: input.seasonReference ? 'selected' : 'unselected'
        },
        scene: input.scene,
        robotSetup: input.robotSetup,
        program: {
            format: 'blockly-serialization',
            state: input.program,
            available: hasProgram,
            restoreSupported: hasProgram,
            ...(hasProgram ? {} : { note: 'No Blockly workspace was supplied.' })
        },
        participantSettings: input.participantSettings,
        assets: {
            sceneEntry: 'scene.json',
            robotEntry: 'robot.mpd',
            ...(input.hasMap ? { mapEntry: 'mat.jpg' as const } : {}),
            modelEntries: input.modelEntries,
            legacyExportsPreserved: true
        },
        capabilities: {
            sceneRestore: true,
            robotSetupRestore: true,
            programRestore: hasProgram,
            seasonRestore: true,
            binaryAssetsInArchive: true
        }
    };
}

export function seasonReferenceFromPackage(
    seasonPackage: SeasonPackageIdentity
): ProjectSeasonReference {
    return {
        schemaVersion: seasonPackage.schemaVersion,
        id: seasonPackage.id,
        name: seasonPackage.name,
        edition: seasonPackage.edition,
        revision: seasonPackage.revision,
        platform: seasonPackage.platform
    };
}

export function parseProjectEnvelope(content: string): ProjectEnvelope {
    let value: unknown;
    try {
        value = JSON.parse(content);
    } catch {
        throw new Error('Invalid project: malformed JSON');
    }
    if (!value || typeof value !== 'object') throw new Error('Invalid project envelope');
    const project = value as Partial<ProjectEnvelope>;
    if (project.format !== PROJECT_FORMAT) throw new Error('Unsupported project format');
    if (project.version !== PROJECT_VERSION) {
        throw new Error(`Unsupported project version: ${String(project.version)}`);
    }
    requiredString(project.createdAt, 'createdAt');
    requiredString(project.updatedAt, 'updatedAt');
    if (!project.scene || typeof project.scene !== 'object') {
        throw new Error('Invalid project: scene is required');
    }
    if (!project.robotSetup || typeof project.robotSetup !== 'object') {
        throw new Error('Invalid project: robot setup is required');
    }
    if (!project.program || typeof project.program !== 'object') {
        throw new Error('Invalid project: program is required');
    }
    if (!project.participantSettings || typeof project.participantSettings !== 'object') {
        throw new Error('Invalid project: participant settings are required');
    }
    if (!project.assets || typeof project.assets !== 'object') {
        throw new Error('Invalid project: asset manifest is required');
    }
    if (!project.capabilities || typeof project.capabilities !== 'object') {
        throw new Error('Invalid project: capabilities are required');
    }
    return project as ProjectEnvelope;
}
