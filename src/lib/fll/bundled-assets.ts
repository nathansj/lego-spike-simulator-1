import { get } from 'svelte/store';
import { loadModel, assetUrl, updateUnresolvedParts } from '$lib/ldraw/components';
import { WebGLCompiler } from '$lib/ldraw/gl';
import {
    createModelPhysicsArticulation,
    findBundledModelPhysics
} from '$lib/physics/articulation-presets';
import { sceneStore, type SceneObject, type SceneStore } from '$lib/spike/scene';

export interface BundledModelAsset {
    missionId: string;
    name: string;
    model: string;
    /** Optional practice placement on the field (mm). Not official coordinates. */
    positionMm?: { x: number; z: number };
}

export interface BundledRobotAsset {
    id: string;
    name: string;
    model: string;
}

export interface BundledAssetManifest {
    schemaVersion: number;
    seasonId: string;
    seasonName: string;
    field: { matWidthMm: number; matHeightMm: number; boundaryHeightMm: number };
    models: BundledModelAsset[];
    robots: BundledRobotAsset[];
}

export interface FieldPlacement {
    x: number;
    z: number;
}

/** Load the season manifest that ships inside the app bundle. */
export async function loadBundledManifest(): Promise<BundledAssetManifest> {
    const response = await fetch(assetUrl('season/manifest.json'));
    if (!response.ok) {
        throw new Error(`Bundled season manifest unavailable (${response.status})`);
    }
    return (await response.json()) as BundledAssetManifest;
}

/** Fetch a bundled text asset (LDraw model) by its manifest-relative path. */
export async function fetchBundledAsset(path: string): Promise<string> {
    const response = await fetch(assetUrl(path));
    if (!response.ok) {
        throw new Error(`Bundled asset ${path} unavailable (${response.status})`);
    }
    return response.text();
}

/** Basename of a bundled asset path, used as the LDraw model name. */
export function bundledAssetName(path: string): string {
    return path.split('/').pop() ?? path;
}

/**
 * Deterministic practice layout across the field, used by "add all missions".
 * These are convenience positions on the mat, NOT official mission coordinates.
 */
export function practiceFieldLayout(
    count: number,
    field: BundledAssetManifest['field']
): FieldPlacement[] {
    if (count <= 0) {
        return [];
    }
    const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / columns);
    const marginX = 300;
    const marginZ = 250;
    const spanX = Math.max(0, field.matWidthMm - marginX * 2);
    const spanZ = Math.max(0, field.matHeightMm - marginZ * 2);
    const stepX = columns > 1 ? spanX / (columns - 1) : 0;
    const stepZ = rows > 1 ? spanZ / (rows - 1) : 0;
    const placements: FieldPlacement[] = [];
    for (let index = 0; index < count; index++) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        placements.push({
            x: -spanX / 2 + column * stepX,
            z: -spanZ / 2 + row * stepZ
        });
    }
    return placements;
}

function uniqueObjectId(scene: SceneStore, name: string): string {
    const base = name.replace(/\.[^.]+$/, '');
    const used = new Set<string>();
    if (scene.robot.id) used.add(scene.robot.id);
    for (const object of scene.objects) {
        if (object.id) used.add(object.id);
    }
    let id = base;
    let suffix = 1;
    while (used.has(id)) id = `${base}-${suffix++}`;
    return id;
}

/**
 * Load a bundled mission model into the live scene at an (optional) placement.
 * Uses the bundled physics sidecar when available; otherwise adds a static mesh.
 */
export async function addBundledMissionToScene(
    asset: BundledModelAsset,
    placement?: FieldPlacement
): Promise<SceneObject[]> {
    const name = bundledAssetName(asset.model);
    const content = await fetchBundledAsset(asset.model);
    const model = loadModel(name, content);
    updateUnresolvedParts();
    const x = placement?.x ?? asset.positionMm?.x ?? 0;
    const z = placement?.z ?? asset.positionMm?.z ?? 0;
    const sidecar = findBundledModelPhysics(name);
    if (sidecar) {
        const compiled = new WebGLCompiler().compileModel(model, {
            rescale: false,
            recenter: false
        });
        const initialY = Number.isFinite(compiled.bbox.min.y) ? -compiled.bbox.min.y : 0;
        const preset = createModelPhysicsArticulation(model, { x, y: initialY, z }, sidecar);
        sceneStore.update((old) => ({
            ...old,
            objects: old.objects.concat(preset.objects),
            joints: [...(old.joints ?? []), ...preset.joints]
        }));
        return preset.objects;
    }
    const object: SceneObject = {
        id: uniqueObjectId(get(sceneStore), name),
        bricks: model,
        anchored: true,
        name,
        position: { x, y: 0, z }
    };
    sceneStore.update((old) => ({ ...old, objects: old.objects.concat([object]) }));
    return [object];
}
