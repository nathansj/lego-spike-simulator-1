import { describe, expect, it } from 'vitest';
import { brickColour, type Model, type Triangle, type Vertex } from '$lib/ldraw/components';
import {
    buildTrimeshCollider,
    collectCompiledTriangles,
    fitModelColliders,
    fitModelCollidersDetailed,
    fitRobotColliders,
    quaternionFromBasis,
    translateColliders
} from '$lib/physics/collider-fit';

const colour = brickColour('16');

function vertex(x: number, y: number, z: number): Vertex {
    return { x, y, z };
}

function triangle(p1: Vertex, p2: Vertex, p3: Vertex): Triangle {
    return { colour, p1, p2, p3 };
}

function quad(target: Triangle[], a: Vertex, b: Vertex, c: Vertex, d: Vertex): void {
    target.push(triangle(a, b, c), triangle(a, c, d));
}

function model(triangles: Triangle[]): Model {
    return { name: 'test', subparts: [], lines: [], triangles, quads: [], optionalLines: [] };
}

/** Axis-aligned box centred on (cx,cy,cz) with full side lengths (LDraw units). */
function boxTriangles(
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number
): Triangle[] {
    const x0 = cx - sx / 2;
    const x1 = cx + sx / 2;
    const y0 = cy - sy / 2;
    const y1 = cy + sy / 2;
    const z0 = cz - sz / 2;
    const z1 = cz + sz / 2;
    const v000 = vertex(x0, y0, z0);
    const v100 = vertex(x1, y0, z0);
    const v110 = vertex(x1, y1, z0);
    const v010 = vertex(x0, y1, z0);
    const v001 = vertex(x0, y0, z1);
    const v101 = vertex(x1, y0, z1);
    const v111 = vertex(x1, y1, z1);
    const v011 = vertex(x0, y1, z1);
    const triangles: Triangle[] = [];
    quad(triangles, v000, v010, v110, v100);
    quad(triangles, v001, v101, v111, v011);
    quad(triangles, v000, v100, v101, v001);
    quad(triangles, v010, v011, v111, v110);
    quad(triangles, v000, v001, v011, v010);
    quad(triangles, v100, v110, v111, v101);
    return triangles;
}

/** Cylinder centred on the origin, axis along LDraw z (segments approximate circle). */
function cylinderTriangles(radius: number, height: number, segments = 32): Triangle[] {
    const triangles: Triangle[] = [];
    const z0 = -height / 2;
    const z1 = height / 2;
    const rim = (index: number, z: number): Vertex => {
        const angle = (index / segments) * Math.PI * 2;
        return vertex(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
    };
    const bottomCentre = vertex(0, 0, z0);
    const topCentre = vertex(0, 0, z1);
    for (let i = 0; i < segments; i++) {
        const a = rim(i, z0);
        const b = rim((i + 1) % segments, z0);
        const c = rim(i, z1);
        const d = rim((i + 1) % segments, z1);
        triangles.push(triangle(bottomCentre, a, b));
        triangles.push(triangle(topCentre, d, c));
        quad(triangles, a, c, d, b);
    }
    return triangles;
}

/** Capsule centred on the origin, axis along LDraw z. `height` is the cylinder section. */
function capsuleTriangles(radius: number, height: number, segments = 24, rings = 6): Triangle[] {
    const triangles: Triangle[] = [];
    const zBottom = -height / 2;
    const zTop = height / 2;
    const ring = (index: number, radial: number, z: number): Vertex => {
        const angle = (index / segments) * Math.PI * 2;
        return vertex(Math.cos(angle) * radial, Math.sin(angle) * radial, z);
    };
    for (let i = 0; i < segments; i++) {
        const a = ring(i, radius, zBottom);
        const b = ring((i + 1) % segments, radius, zBottom);
        const c = ring(i, radius, zTop);
        const d = ring((i + 1) % segments, radius, zTop);
        quad(triangles, a, c, d, b);
    }
    const bottomPole = vertex(0, 0, zBottom - radius);
    const topPole = vertex(0, 0, zTop + radius);
    for (let ringIndex = 0; ringIndex < rings; ringIndex++) {
        const t0 = (ringIndex / rings) * (Math.PI / 2);
        const t1 = ((ringIndex + 1) / rings) * (Math.PI / 2);
        const radial0 = radius * Math.cos(t0);
        const radial1 = radius * Math.cos(t1);
        const zLow0 = zBottom - radius * Math.sin(t0);
        const zLow1 = zBottom - radius * Math.sin(t1);
        const zHigh0 = zTop + radius * Math.sin(t0);
        const zHigh1 = zTop + radius * Math.sin(t1);
        const last = ringIndex === rings - 1;
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const lowA = ring(i, radial0, zLow0);
            const lowB = ring(next, radial0, zLow0);
            const highA = ring(i, radial0, zHigh0);
            const highB = ring(next, radial0, zHigh0);
            if (last) {
                triangles.push(triangle(lowA, lowB, bottomPole));
                triangles.push(triangle(highB, highA, topPole));
            } else {
                const lowC = ring(i, radial1, zLow1);
                const lowD = ring(next, radial1, zLow1);
                const highC = ring(i, radial1, zHigh1);
                const highD = ring(next, radial1, zHigh1);
                quad(triangles, lowA, lowC, lowD, lowB);
                quad(triangles, highA, highB, highD, highC);
            }
        }
    }
    return triangles;
}

function sortedSizes(size: { x: number; y: number; z: number }): number[] {
    return [size.x, size.y, size.z].sort((a, b) => b - a);
}

describe('collectCompiledTriangles', () => {
    it('converts LDraw units to the compiled millimetre frame', () => {
        const triangles = collectCompiledTriangles(model(boxTriangles(0, 0, 0, 100, 50, 20)));
        expect(triangles).toHaveLength(12);
        const xs = triangles.flatMap((triangle) => triangle.map((point) => point[0]));
        // 100 LDraw units * 0.4 mm/LDU = 40 mm.
        expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(40, 5);
    });
});

describe('fitModelColliders', () => {
    it('fits an oriented box to a single rectangular box', () => {
        const colliders = fitModelColliders(model(boxTriangles(0, 0, 0, 100, 50, 20)));
        expect(colliders).toHaveLength(1);
        const collider = colliders[0];
        expect(collider.shape).toBe('box');
        if (collider.shape !== 'box') return;
        // 40 x 20 x 8 mm.
        expect(sortedSizes(collider.sizeMm)[0]).toBeCloseTo(40, 0);
        expect(sortedSizes(collider.sizeMm)[1]).toBeCloseTo(20, 0);
        expect(sortedSizes(collider.sizeMm)[2]).toBeCloseTo(8, 0);
        expect(collider.positionMm?.x).toBeCloseTo(0, 4);
        expect(collider.positionMm?.y).toBeCloseTo(0, 4);
        expect(collider.positionMm?.z).toBeCloseTo(0, 4);
    });

    it('places an off-centre box collider at the mesh centre', () => {
        const colliders = fitModelColliders(model(boxTriangles(30, 0, 0, 20, 20, 20)));
        expect(colliders).toHaveLength(1);
        // 30 LDraw units * 0.4 = 12 mm.
        expect(colliders[0].positionMm?.x).toBeCloseTo(12, 3);
        expect(colliders[0].positionMm?.y).toBeCloseTo(0, 4);
        expect(colliders[0].positionMm?.z).toBeCloseTo(0, 4);
    });

    it('returns a separate collider for each disconnected part', () => {
        const triangles = [
            ...boxTriangles(0, 0, 0, 20, 20, 20),
            ...boxTriangles(100, 0, 0, 20, 20, 20)
        ];
        const result = fitModelCollidersDetailed(model(triangles));
        expect(result.componentCount).toBe(2);
        expect(result.colliders).toHaveLength(2);
        const centres = result.colliders
            .map((collider) => collider.positionMm?.x ?? 0)
            .sort((a, b) => a - b);
        expect(centres[0]).toBeCloseTo(0, 3);
        expect(centres[1]).toBeCloseTo(40, 3);
    });

    it('classifies a round shaft as a cylinder', () => {
        const colliders = fitModelColliders(model(cylinderTriangles(20, 40)));
        expect(colliders).toHaveLength(1);
        const collider = colliders[0];
        expect(collider.shape).toBe('cylinder');
        if (collider.shape !== 'cylinder') return;
        expect(collider.radiusMm).toBeCloseTo(8, 1);
        expect(collider.heightMm).toBeCloseTo(16, 1);
    });

    it('classifies a rounded shaft as a capsule', () => {
        const colliders = fitModelColliders(model(capsuleTriangles(10, 40)));
        expect(colliders).toHaveLength(1);
        expect(colliders[0].shape).toBe('capsule');
    });

    it('honours boxOnly by never emitting round primitives', () => {
        const colliders = fitModelColliders(model(cylinderTriangles(20, 40)), { boxOnly: true });
        expect(colliders).toHaveLength(1);
        expect(colliders[0].shape).toBe('box');
    });

    it('drops parts below the minimum volume threshold', () => {
        const triangles = [
            ...boxTriangles(0, 0, 0, 100, 100, 100),
            ...boxTriangles(1000, 0, 0, 10, 10, 10)
        ];
        const colliders = fitModelColliders(model(triangles), { minVolumeMm3: 1000 });
        expect(colliders).toHaveLength(1);
    });

    it('measures round primitives by their true volume in the volume filter', () => {
        // Cylinder radius 8 mm, height 16 mm -> ~3217 mm^3, not 4x that value.
        const colliders = fitModelColliders(model(cylinderTriangles(20, 40)), {
            minVolumeMm3: 5000
        });
        expect(colliders).toHaveLength(0);
    });

    it('is deterministic for identical input', () => {
        const build = (): Model => model(cylinderTriangles(20, 40));
        const first = JSON.stringify(fitModelColliders(build()));
        const second = JSON.stringify(fitModelColliders(build()));
        expect(first).toBe(second);
    });

    it('clusters nearby parts into one primitive when within the merge distance', () => {
        const triangles = [
            ...boxTriangles(0, 0, 0, 20, 20, 20),
            ...boxTriangles(100, 0, 0, 20, 20, 20)
        ];
        // 100 LDraw units = 40 mm between centres; boxes are 8 mm wide, so the
        // AABB gap is ~32 mm.
        const merged = fitModelColliders(model(triangles), { clusterDistanceMm: 40 });
        const separate = fitModelColliders(model(triangles), { clusterDistanceMm: 10 });
        expect(merged).toHaveLength(1);
        expect(separate).toHaveLength(2);
    });

    it('respects maxClusterParts when clustering', () => {
        const triangles = [
            ...boxTriangles(0, 0, 0, 20, 20, 20),
            ...boxTriangles(50, 0, 0, 20, 20, 20),
            ...boxTriangles(100, 0, 0, 20, 20, 20)
        ];
        const colliders = fitModelColliders(model(triangles), {
            clusterDistanceMm: 100,
            maxClusterParts: 1
        });
        expect(colliders).toHaveLength(3);
    });
});

describe('fitRobotColliders', () => {
    it('emits a wheel cylinder plus layered chassis boxes with explicit mass', () => {
        const wheel: Model = model(boxTriangles(0, 0, 0, 220, 220, 35));
        const robot: Model = {
            name: 'robot',
            lines: [],
            quads: [],
            optionalLines: [],
            triangles: boxTriangles(0, 0, 0, 250, 225, 500),
            subparts: [
                {
                    id: 1,
                    colour,
                    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                    model: wheel,
                    modelNumber: '49295p01.dat'
                }
            ]
        };

        const result = fitRobotColliders(robot, { chassisLayers: 3, massKg: 1 });
        expect(result.wheelCount).toBe(1);
        expect(result.chassisCount).toBeGreaterThan(0);
        const wheelCollider = result.colliders.find((collider) => collider.shape === 'cylinder');
        expect(wheelCollider?.shape).toBe('cylinder');
        if (wheelCollider?.shape === 'cylinder') {
            expect(wheelCollider.radiusMm).toBeCloseTo(44, 4);
            expect(wheelCollider.heightMm).toBeCloseTo(14, 4);
            const wheelBottom = (wheelCollider.positionMm?.y ?? 0) - wheelCollider.radiusMm;
            for (const box of result.colliders) {
                if (box.shape !== 'box') continue;
                const bottom = (box.positionMm?.y ?? 0) - box.sizeMm.y / 2;
                expect(bottom).toBeGreaterThanOrEqual(wheelBottom + 1 - 1e-6);
            }
        }
        const totalMass = result.colliders.reduce(
            (sum, collider) => sum + (collider.massKg ?? 0),
            0
        );
        expect(totalMass).toBeCloseTo(1, 6);
    });

    it('falls back to chassis only when no wheels are present', () => {
        const result = fitRobotColliders(model(boxTriangles(0, 0, 0, 200, 80, 300)));
        expect(result.wheelCount).toBe(0);
        expect(result.chassisCount).toBeGreaterThan(0);
    });
});

describe('buildTrimeshCollider', () => {
    it('emits every compiled triangle as an indexed trimesh', () => {
        const collider = buildTrimeshCollider(model(boxTriangles(0, 0, 0, 100, 50, 20)));
        expect(collider?.shape).toBe('trimesh');
        if (!collider || collider.shape !== 'trimesh') return;
        expect(collider.indices).toHaveLength(36);
        expect(collider.verticesMm).toHaveLength(36 * 3);
        expect(collider.indices[collider.indices.length - 1]).toBe(35);
    });

    it('returns undefined for a model with no triangles', () => {
        expect(buildTrimeshCollider(model([]))).toBeUndefined();
    });
});

describe('translateColliders', () => {
    it('shifts every collider position by the offset', () => {
        const colliders = fitModelColliders(model(boxTriangles(0, 0, 0, 20, 20, 20)));
        const shifted = translateColliders(colliders, { x: 5, y: -3, z: 2 });
        expect(shifted[0].positionMm).toEqual({
            x: (colliders[0].positionMm?.x ?? 0) + 5,
            y: (colliders[0].positionMm?.y ?? 0) - 3,
            z: (colliders[0].positionMm?.z ?? 0) + 2
        });
    });

    it('returns the same colliders for a zero offset', () => {
        const colliders = fitModelColliders(model(boxTriangles(0, 0, 0, 20, 20, 20)));
        expect(translateColliders(colliders, { x: 0, y: 0, z: 0 })).toBe(colliders);
    });
});

describe('quaternionFromBasis', () => {
    it('returns a unit quaternion for an orthonormal basis', () => {
        const quaternion = quaternionFromBasis([0, 1, 0], [-1, 0, 0], [0, 0, 1]);
        const length = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        expect(length).toBeCloseTo(1, 10);
        expect(quaternion.w).toBeGreaterThanOrEqual(0);
    });
});
