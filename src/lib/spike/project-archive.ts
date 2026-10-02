import JSZip from 'jszip';
import type { BlocklyState } from '$lib/blockly/state';
import type { DroneSurveyObservationGeometryProfile } from '$lib/fll/drone-survey-observation-geometry-profile';
import {
    M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
    parseM01ObservationProfileArchiveEntry
} from '$lib/spike/m01-observation-profile-archive';
import {
    parseProjectEnvelope,
    PROJECT_ARCHIVE_ENTRY,
    type ProjectEnvelope
} from '$lib/spike/project-contract';
import { legacySceneObjectArchiveEntry, sceneObjectArchiveEntry } from '$lib/spike/scene-archive';
import { parseSceneDefinition } from '$lib/spike/scene-schema';
import { parseRobotArchiveEntry, ROBOT_ARCHIVE_ENTRY } from '$lib/spike/robot-archive';
import type { SceneStore } from '$lib/spike/scene';

export type ProjectArchiveInput = string | ArrayBuffer | Uint8Array | Blob;

export interface ProjectArchiveModelEntry {
    objectId?: string;
    entry: string;
    content: string;
}

export interface ProjectArchiveRobotEntry {
    entry: typeof ROBOT_ARCHIVE_ENTRY;
    content: string;
}

export interface ProjectArchiveCalibration {
    m01ObservationProfile?: DroneSurveyObservationGeometryProfile;
}

export interface ProjectArchiveBasePayload {
    scene: Omit<SceneStore, 'map'>;
    map?: Uint8Array;
    models: ProjectArchiveModelEntry[];
    missingModelIds: string[];
    calibration?: ProjectArchiveCalibration;
}

export interface ProjectArchiveProjectPayload extends ProjectArchiveBasePayload {
    sourceFormat: 'project';
    project: ProjectEnvelope;
    robot: ProjectArchiveRobotEntry;
    program?: BlocklyState;
}

export interface ProjectArchiveLegacyPayload extends ProjectArchiveBasePayload {
    sourceFormat: 'legacy-scene';
    robot?: ProjectArchiveRobotEntry;
    program?: undefined;
}

export type ProjectArchivePayload = ProjectArchiveProjectPayload | ProjectArchiveLegacyPayload;

function asRecord(value: unknown, name: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Malformed project: ${name} must be an object`);
    }
    return value as Record<string, unknown>;
}

function hasFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/** Accepts a finite number or a numeric string (legacy project saves). */
function numberLike(value: unknown): number | undefined {
    if (hasFiniteNumber(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
}

function hasSafeEntryName(entry: unknown): entry is string {
    return (
        typeof entry === 'string' &&
        entry.trim().length > 0 &&
        !entry.startsWith('/') &&
        !entry.includes('\\') &&
        !entry.split('/').some((part) => part === '..' || part === '.')
    );
}

function validateBlocklyState(value: unknown): asserts value is BlocklyState {
    const state = asRecord(value, 'program.state');
    if (state.variables !== undefined && !Array.isArray(state.variables)) {
        throw new Error('Malformed project: program.state.variables must be an array');
    }
    if (state.blocks !== undefined) {
        const blocks = asRecord(state.blocks, 'program.state.blocks');
        if (!Array.isArray(blocks.blocks) || !hasFiniteNumber(blocks.languageVersion)) {
            throw new Error(
                'Malformed project: program.state.blocks requires blocks and languageVersion'
            );
        }
    }
    if (state.workspaceComments !== undefined && !Array.isArray(state.workspaceComments)) {
        throw new Error('Malformed project: program.state.workspaceComments must be an array');
    }
}

function validateProjectMetadata(project: ProjectEnvelope): string[] {
    const season = asRecord(project.season, 'season');
    if (!['selected', 'unselected', 'unavailable'].includes(String(season.status))) {
        throw new Error(`Malformed project: unsupported season status ${String(season.status)}`);
    }
    const seasonReference = asRecord(season.reference, 'season.reference');
    if (
        typeof seasonReference.id !== 'string' ||
        typeof seasonReference.name !== 'string' ||
        !seasonReference.id.trim() ||
        !seasonReference.name.trim()
    ) {
        throw new Error('Malformed project: season reference requires id and name');
    }

    const assets = asRecord(project.assets, 'assets');
    if (assets.sceneEntry !== 'scene.json') {
        throw new Error('Malformed project: assets.sceneEntry must be scene.json');
    }
    if (assets.robotEntry !== ROBOT_ARCHIVE_ENTRY) {
        throw new Error(`Malformed project: assets.robotEntry must be ${ROBOT_ARCHIVE_ENTRY}`);
    }
    if (assets.mapEntry !== undefined && assets.mapEntry !== 'mat.jpg') {
        throw new Error('Malformed project: assets.mapEntry must be mat.jpg');
    }
    if (assets.legacyExportsPreserved !== true) {
        throw new Error('Malformed project: assets.legacyExportsPreserved must be true');
    }
    if (!Array.isArray(assets.modelEntries)) {
        throw new Error('Malformed project: assets.modelEntries must be an array');
    }
    const modelEntries = assets.modelEntries.map((entry, index) => {
        if (!hasSafeEntryName(entry)) {
            throw new Error(`Malformed project: assets.modelEntries[${index}] is invalid`);
        }
        return entry;
    });
    if (new Set(modelEntries).size !== modelEntries.length) {
        throw new Error('Malformed project: assets.modelEntries must be unique');
    }

    const robotSetup = asRecord(project.robotSetup, 'robotSetup');
    if (robotSetup.archiveEntry !== ROBOT_ARCHIVE_ENTRY) {
        throw new Error(
            `Malformed project: robotSetup.archiveEntry must be ${ROBOT_ARCHIVE_ENTRY}`
        );
    }
    if (!Array.isArray(robotSetup.ports) || !Array.isArray(robotSetup.wheels)) {
        throw new Error('Malformed project: robot setup requires ports and wheels arrays');
    }
    robotSetup.ports.forEach((port, index) => {
        const value = asRecord(port, `robotSetup.ports[${index}]`);
        if (typeof value.port !== 'string' || typeof value.type !== 'string') {
            throw new Error(`Malformed project: robotSetup.ports[${index}] requires port and type`);
        }
        if (value.componentId !== 'none' && !hasFiniteNumber(value.componentId)) {
            throw new Error(`Malformed project: robotSetup.ports[${index}].componentId is invalid`);
        }
    });
    robotSetup.wheels.forEach((wheel, index) => {
        const value = asRecord(wheel, `robotSetup.wheels[${index}]`);
        const componentId = numberLike(value.componentId);
        const radiusMm = numberLike(value.radiusMm);
        const gearing = numberLike(value.gearing);
        if (
            typeof value.port !== 'string' ||
            componentId === undefined ||
            radiusMm === undefined ||
            radiusMm <= 0 ||
            gearing === undefined
        ) {
            throw new Error(`Malformed project: robotSetup.wheels[${index}] is invalid`);
        }
        value.componentId = componentId;
        value.radiusMm = radiusMm;
        value.gearing = gearing;
        for (const vectorName of ['positionMm', 'direction']) {
            const vector = asRecord(value[vectorName], `robotSetup.wheels[${index}].${vectorName}`);
            const normalized: Record<string, number> = {};
            for (const axis of ['x', 'y', 'z']) {
                const component = numberLike(vector[axis]);
                if (component === undefined) {
                    throw new Error(
                        `Malformed project: robotSetup.wheels[${index}].${vectorName} is invalid`
                    );
                }
                normalized[axis] = component;
            }
            value[vectorName] = normalized;
        }
    });

    const program = asRecord(project.program, 'program');
    if (program.format !== 'blockly-serialization') {
        throw new Error('Malformed project: program.format is unsupported');
    }
    if (typeof program.available !== 'boolean' || typeof program.restoreSupported !== 'boolean') {
        throw new Error('Malformed project: program availability flags are required');
    }
    if (program.state !== undefined) validateBlocklyState(program.state);
    if ((program.available || program.restoreSupported) && program.state === undefined) {
        throw new Error(
            'Malformed project: program.state is required when program data is available'
        );
    }

    const settings = asRecord(project.participantSettings, 'participantSettings');
    asRecord(settings.simulation, 'participantSettings.simulation');
    asRecord(settings.display, 'participantSettings.display');

    const capabilities = asRecord(project.capabilities, 'capabilities');
    for (const capability of [
        'sceneRestore',
        'robotSetupRestore',
        'programRestore',
        'seasonRestore',
        'binaryAssetsInArchive'
    ]) {
        if (typeof capabilities[capability] !== 'boolean') {
            throw new Error(`Malformed project: capabilities.${capability} must be boolean`);
        }
    }
    if (capabilities.sceneRestore !== true || capabilities.robotSetupRestore !== true) {
        throw new Error('Malformed project: scene and robot restoration must be supported');
    }
    if (capabilities.programRestore !== project.program.restoreSupported) {
        throw new Error(
            'Malformed project: program restore capability does not match program data'
        );
    }

    return modelEntries;
}

function requiredFile(zip: JSZip, entry: string): JSZip.JSZipObject {
    const file = zip.file(entry);
    if (!file) throw new Error(`Missing required project archive entry "${entry}"`);
    if (file.dir) throw new Error(`Invalid project archive entry "${entry}": expected a file`);
    return file;
}

function optionalFile(zip: JSZip, entry: string): JSZip.JSZipObject | undefined {
    const file = zip.file(entry);
    if (!file) return undefined;
    if (file.dir) throw new Error(`Invalid project archive entry "${entry}": expected a file`);
    return file;
}

async function readText(file: JSZip.JSZipObject, entry: string): Promise<string> {
    try {
        const content = await file.async('string');
        if (content.trim().length === 0) {
            throw new Error('entry is empty');
        }
        return content;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'could not be read';
        throw new Error(`Invalid project archive entry "${entry}": ${message}`);
    }
}

async function readBinary(file: JSZip.JSZipObject, entry: string): Promise<Uint8Array> {
    try {
        return await file.async('uint8array');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'could not be read';
        throw new Error(`Invalid project archive entry "${entry}": ${message}`);
    }
}

function parseJson(content: string, entry: string): unknown {
    try {
        return JSON.parse(content);
    } catch {
        throw new Error(`Malformed project archive entry "${entry}": invalid JSON`);
    }
}

async function readCalibration(zip: JSZip): Promise<ProjectArchiveCalibration | undefined> {
    const file = optionalFile(zip, M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY);
    if (!file) return undefined;
    const entry = M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY;
    try {
        return {
            m01ObservationProfile: parseM01ObservationProfileArchiveEntry(
                await readText(file, entry)
            )
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'could not be parsed';
        throw new Error(`Malformed project archive entry "${entry}": ${message}`);
    }
}

async function readModels(
    zip: JSZip,
    scene: Omit<SceneStore, 'map'>,
    entries: string[],
    required: boolean
): Promise<{ models: ProjectArchiveModelEntry[]; missingModelIds: string[] }> {
    const models: ProjectArchiveModelEntry[] = [];
    const missingModelIds: string[] = [];
    if (required) {
        for (const entry of entries) {
            const file = requiredFile(zip, entry);
            const objectId = scene.objects.find(
                (object) => object.id && sceneObjectArchiveEntry(object.id) === entry
            )?.id;
            models.push({ entry, objectId, content: await readText(file, entry) });
        }
        return { models, missingModelIds };
    }

    for (const object of scene.objects) {
        const stableEntry = object.id ? sceneObjectArchiveEntry(object.id) : undefined;
        const legacyEntry = legacySceneObjectArchiveEntry(object.name);
        const stableFile = stableEntry ? optionalFile(zip, stableEntry) : undefined;
        const legacyFile = stableFile ? undefined : optionalFile(zip, legacyEntry);
        const file = stableFile ?? legacyFile;
        const entry = stableFile ? stableEntry : legacyFile ? legacyEntry : undefined;
        if (!file || !entry) {
            missingModelIds.push(object.id ?? object.name);
            continue;
        }
        models.push({ objectId: object.id, entry, content: await readText(file, entry) });
    }
    return { models, missingModelIds };
}

async function loadProject(zip: JSZip): Promise<ProjectArchiveProjectPayload> {
    const projectEntry = requiredFile(zip, PROJECT_ARCHIVE_ENTRY);
    let project: ProjectEnvelope;
    try {
        project = parseProjectEnvelope(await readText(projectEntry, PROJECT_ARCHIVE_ENTRY));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'invalid project envelope';
        throw new Error(`Malformed project archive entry "${PROJECT_ARCHIVE_ENTRY}": ${message}`);
    }
    const modelEntries = validateProjectMetadata(project);
    const sceneEntry = requiredFile(zip, project.assets.sceneEntry);
    const sceneDefinition = parseJson(
        await readText(sceneEntry, project.assets.sceneEntry),
        project.assets.sceneEntry
    );
    const scene = parseSceneDefinition(sceneDefinition);
    if (JSON.stringify(project.scene) !== JSON.stringify(sceneDefinition)) {
        throw new Error('Malformed project: project.json scene does not match scene.json');
    }

    const robotEntry = requiredFile(zip, project.assets.robotEntry);
    const robotContent = await readText(robotEntry, project.assets.robotEntry);
    try {
        parseRobotArchiveEntry(robotContent);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'invalid robot data';
        throw new Error(
            `Malformed project archive entry "${project.assets.robotEntry}": ${message}`
        );
    }
    const map = project.assets.mapEntry
        ? await readBinary(requiredFile(zip, project.assets.mapEntry), project.assets.mapEntry)
        : undefined;
    const { models, missingModelIds } = await readModels(zip, scene, modelEntries, true);
    const calibration = await readCalibration(zip);
    return {
        sourceFormat: 'project',
        project,
        scene,
        robot: { entry: ROBOT_ARCHIVE_ENTRY, content: robotContent },
        map,
        models,
        missingModelIds,
        program: project.program.state,
        calibration
    };
}

async function loadLegacyScene(zip: JSZip): Promise<ProjectArchiveLegacyPayload> {
    const sceneEntry = requiredFile(zip, 'scene.json');
    const sceneDefinition = parseJson(await readText(sceneEntry, 'scene.json'), 'scene.json');
    let scene: Omit<SceneStore, 'map'>;
    try {
        scene = parseSceneDefinition(sceneDefinition);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'invalid scene definition';
        throw new Error('Malformed legacy scene archive entry "scene.json": ' + message);
    }
    const robotFile = optionalFile(zip, ROBOT_ARCHIVE_ENTRY);
    let robot: ProjectArchiveRobotEntry | undefined;
    if (robotFile) {
        const content = await readText(robotFile, ROBOT_ARCHIVE_ENTRY);
        try {
            parseRobotArchiveEntry(content);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'invalid robot data';
            throw new Error(
                `Malformed legacy scene archive entry "${ROBOT_ARCHIVE_ENTRY}": ${message}`
            );
        }
        robot = { entry: ROBOT_ARCHIVE_ENTRY, content };
    }
    const mapFile = optionalFile(zip, 'mat.jpg');
    const map = mapFile ? await readBinary(mapFile, 'mat.jpg') : undefined;
    const { models, missingModelIds } = await readModels(zip, scene, [], false);
    const calibration = await readCalibration(zip);
    return {
        sourceFormat: 'legacy-scene',
        scene,
        robot,
        map,
        models,
        missingModelIds,
        calibration
    };
}

export async function loadProjectArchive(
    input: ProjectArchiveInput
): Promise<ProjectArchivePayload> {
    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(input);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'could not be read';
        throw new Error(`Invalid project archive: ${message}`);
    }
    return zip.file(PROJECT_ARCHIVE_ENTRY) ? loadProject(zip) : loadLegacyScene(zip);
}
