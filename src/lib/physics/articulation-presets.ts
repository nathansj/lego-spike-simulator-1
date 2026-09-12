import type { Model, Subpart } from '$lib/ldraw/components';
import { WebGLCompiler } from '$lib/ldraw/gl';
import type { JointDefinition, PhysicsDefinition } from '$lib/physics/types';
import type { SceneObject, Vector } from '$lib/spike/scene';
import bioglow45832 from '$lib/physics/model-sidecars/45832_01.physics.json';
import bioglow45832_02 from '$lib/physics/model-sidecars/45832_02.physics.json';
import bioglow45832_03 from '$lib/physics/model-sidecars/45832_03.physics.json';
import bioglow45832_04 from '$lib/physics/model-sidecars/45832_04.physics.json';
import bioglow45832_05 from '$lib/physics/model-sidecars/45832_05.physics.json';
import bioglow45832_06 from '$lib/physics/model-sidecars/45832_06.physics.json';
import bioglow45832_07 from '$lib/physics/model-sidecars/45832_07.physics.json';
import bioglow45832_08 from '$lib/physics/model-sidecars/45832_08.physics.json';
import bioglow45832_09 from '$lib/physics/model-sidecars/45832_09.physics.json';
import bioglow45832_10 from '$lib/physics/model-sidecars/45832_10.physics.json';
import bioglow45832_11 from '$lib/physics/model-sidecars/45832_11.physics.json';
import bioglow45832_12 from '$lib/physics/model-sidecars/45832_12.physics.json';
import bioglow45832_13 from '$lib/physics/model-sidecars/45832_13.physics.json';

interface RangeSelection {
    min?: number;
    max?: number;
    minExclusive?: number;
    maxExclusive?: number;
}

interface ModelNumberSelection {
    modelNumbers?: string[];
    x?: RangeSelection;
    y?: RangeSelection;
    z?: RangeSelection;
}

export interface ModelPhysicsSegment {
    id: string;
    name: string;
    selection: ModelNumberSelection;
    includeRootGeometry?: boolean;
    editorGroup?: string;
    editorName?: string;
    body: PhysicsDefinition;
}

export interface ModelPhysicsSidecar {
    version: 1;
    model: string;
    mission?: string;
    mechanics?: string[];
    tuningStatus?: string;
    segments: ModelPhysicsSegment[];
    joints: JointDefinition[];
}

export interface ArticulationPresetResult {
    objects: SceneObject[];
    joints: JointDefinition[];
}

const bundledSidecars = [
    bioglow45832,
    bioglow45832_02,
    bioglow45832_03,
    bioglow45832_04,
    bioglow45832_05,
    bioglow45832_06,
    bioglow45832_07,
    bioglow45832_08,
    bioglow45832_09,
    bioglow45832_10,
    bioglow45832_11,
    bioglow45832_12,
    bioglow45832_13
] as ModelPhysicsSidecar[];

function basename(path: string): string {
    return path.split(/[/\\]/).pop()?.toLowerCase() ?? path.toLowerCase();
}

export function parseModelPhysicsSidecar(value: unknown): ModelPhysicsSidecar {
    if (!value || typeof value !== 'object') throw new Error('Invalid model physics sidecar');
    const sidecar = value as Partial<ModelPhysicsSidecar>;
    if (sidecar.version !== 1 || typeof sidecar.model !== 'string') {
        throw new Error('Unsupported model physics sidecar');
    }
    if (!Array.isArray(sidecar.segments) || !Array.isArray(sidecar.joints)) {
        throw new Error('Model physics sidecar must contain segments and joints');
    }
    for (const segment of sidecar.segments) {
        if (!segment.id || !segment.name || !segment.body || !segment.selection) {
            throw new Error('Invalid model physics segment');
        }
    }
    return sidecar as ModelPhysicsSidecar;
}

export function findBundledModelPhysics(fileName: string): ModelPhysicsSidecar | undefined {
    return bundledSidecars.find((sidecar) => basename(sidecar.model) === basename(fileName));
}

function inRange(value: number, range?: RangeSelection): boolean {
    if (!range) return true;
    return (
        (range.min === undefined || value >= range.min) &&
        (range.max === undefined || value <= range.max) &&
        (range.minExclusive === undefined || value > range.minExclusive) &&
        (range.maxExclusive === undefined || value < range.maxExclusive)
    );
}

function normalizedModelNumber(modelNumber: string): string {
    return basename(modelNumber).trim();
}

function matches(subpart: Subpart, segment: ModelPhysicsSegment): boolean {
    const modelNumbers = segment.selection.modelNumbers;
    const matchesModelNumber =
        modelNumbers === undefined ||
        modelNumbers.some(
            (modelNumber) =>
                normalizedModelNumber(modelNumber) === normalizedModelNumber(subpart.modelNumber)
        );
    return (
        matchesModelNumber &&
        inRange(Number(subpart.matrix[12]), segment.selection.x) &&
        inRange(Number(subpart.matrix[13]), segment.selection.y) &&
        inRange(Number(subpart.matrix[14]), segment.selection.z)
    );
}

function modelSegment(source: Model, segment: ModelPhysicsSegment, subparts: Subpart[]): Model {
    const includeRoot = segment.includeRootGeometry === true;
    return {
        name: `${segment.id}.ldr`,
        subparts,
        lines: includeRoot ? source.lines : [],
        triangles: includeRoot ? source.triangles : [],
        quads: includeRoot ? source.quads : [],
        optionalLines: includeRoot ? source.optionalLines : []
    };
}

function explicitPhysicsForSegment(segmentModel: Model, body: PhysicsDefinition): PhysicsDefinition {
    if (!body.autoCollider && body.colliders.length > 0) {
        return body;
    }

    const bbox = new WebGLCompiler().computeBoundingBox(segmentModel);
    const colliders =
        bbox && Number.isFinite(bbox.max.x - bbox.min.x) && Number.isFinite(bbox.max.y - bbox.min.y)
            ? [
                  {
                      shape: 'box' as const,
                      sizeMm: {
                          x: Math.max(1, bbox.max.x - bbox.min.x),
                          y: Math.max(1, bbox.max.y - bbox.min.y),
                          z: Math.max(1, bbox.max.z - bbox.min.z)
                      },
                      positionMm: {
                          x: (bbox.min.x + bbox.max.x) / 2,
                          y: (bbox.min.y + bbox.max.y) / 2,
                          z: (bbox.min.z + bbox.max.z) / 2
                      }
                  }
              ]
            : [
                  {
                      shape: 'box' as const,
                      sizeMm: { x: 100, y: 100, z: 100 }
                  }
              ];

    return {
        ...body,
        autoCollider: false,
        colliders
    };
}

/**
 * Materialize a model's physics from its geometry when no authored collider
 * definition is available. This is deliberately model-generic: callers supply
 * the body properties and every resulting body has explicit colliders before
 * it reaches the physics world.
 */
export function createExplicitModelPhysics(
    model: Model,
    body: Omit<PhysicsDefinition, 'colliders' | 'autoCollider'> &
        Partial<Pick<PhysicsDefinition, 'colliders' | 'autoCollider'>>
): PhysicsDefinition {
    return explicitPhysicsForSegment(model, {
        ...body,
        autoCollider: body.autoCollider ?? true,
        colliders: body.colliders ?? []
    });
}

export function createModelPhysicsArticulation(
    source: Model,
    position: Vector,
    sidecar: ModelPhysicsSidecar
): ArticulationPresetResult {
    const groups = sidecar.segments.map(() => [] as Subpart[]);
    for (const subpart of source.subparts) {
        const index = sidecar.segments.findIndex((segment) => matches(subpart, segment));
        if (index < 0) throw new Error(`No physics segment matches subpart ${subpart.modelNumber}`);
        groups[index].push(subpart);
    }
    return {
        objects: sidecar.segments.map((segment, index) => {
            const bricks = modelSegment(source, segment, groups[index]);
            return {
                id: segment.id,
                name: segment.name,
                anchored: segment.body.bodyType === 'fixed',
                position: { ...position },
                rotation: 0,
                preserveOrigin: true,
                editorGroup: segment.editorGroup,
                editorName: segment.editorName,
                bricks,
                physics: explicitPhysicsForSegment(bricks, structuredClone(segment.body))
            };
        }),
        joints: structuredClone(sidecar.joints)
    };
}
