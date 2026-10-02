/**
 * Geometry-driven collider fitting.
 *
 * Compiles an LDraw {@link Model} into triangles, splits the surface into
 * connected parts, and fits each part with a tight convex primitive
 * (box, cylinder, or capsule). The output is a compound collider definition in
 * the same local millimetre frame the renderer and existing colliders use.
 *
 * The fitter is deliberately model-generic and does not read mission names,
 * sidecar `mechanics` labels, or season data. It is a geometry tool, not a
 * mechanics or scoring authority; fitted colliders remain uncalibrated until
 * verified against a physical reference.
 */
import type { Model, Quad, Triangle, Vertex } from '$lib/ldraw/components';
import * as m4 from '$lib/ldraw/m4';
import { WebGLCompiler } from '$lib/ldraw/gl';
import type { ColliderDefinition, PhysicsQuaternion, PhysicsVector } from '$lib/physics/types';

type Vec3 = [number, number, number];
type Triangle3 = [Vec3, Vec3, Vec3];

export interface ColliderFitOptions {
    /** Vertices within this distance (mm) are treated as joined. */
    weldToleranceMm?: number;
    /** Components whose box volume is below this (mm^3) are discarded. */
    minVolumeMm3?: number;
    /** Optional cap on collider count; the smallest parts are merged into one box. */
    maxColliders?: number;
    /** Force box primitives only (no cylinder/capsule classification). */
    boxOnly?: boolean;
    /** Relative tolerance for circular cross-sections (0.2 = 20%). */
    circularTolerance?: number;
    /** Relative end shrink that marks a rounded (capsule) end. */
    capsuleEndTolerance?: number;
    /** Merge parts whose bounding boxes are within this distance (mm). 0 disables clustering. */
    clusterDistanceMm?: number;
    /** Maximum number of source parts allowed in one cluster. */
    maxClusterParts?: number;
}

export interface ColliderFitResult {
    colliders: ColliderDefinition[];
    /** Number of connected parts found before any filtering, clustering, or merging. */
    componentCount: number;
}

const DEFAULT_OPTIONS: Required<ColliderFitOptions> = {
    weldToleranceMm: 0.01,
    minVolumeMm3: 1,
    maxColliders: Number.POSITIVE_INFINITY,
    boxOnly: false,
    circularTolerance: 0.2,
    capsuleEndTolerance: 0.18,
    clusterDistanceMm: 0.5,
    maxClusterParts: 8
};

/**
 * Fit a compound of convex primitives to a compiled LDraw model.
 */
export function fitModelColliders(
    model: Model,
    options?: ColliderFitOptions
): ColliderDefinition[] {
    return fitModelCollidersDetailed(model, options).colliders;
}

export function fitModelCollidersDetailed(
    model: Model,
    options?: ColliderFitOptions
): ColliderFitResult {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const triangles = collectCompiledTriangles(model);
    const components = connectedComponents(triangles, config.weldToleranceMm);

    interface Part {
        collider: ColliderDefinition;
        boxVolume: number;
        points: Vec3[];
    }

    const componentData = components
        .map((component) => componentPoints(component, triangles, config.weldToleranceMm))
        .filter((points) => points.length > 0)
        .map((points) => ({ points, ...boundsOf(points) }));

    const clusters = clusterComponents(
        componentData,
        config.clusterDistanceMm,
        config.maxClusterParts,
        config.weldToleranceMm
    );

    const parts: Part[] = [];
    for (const points of clusters) {
        const fitted = fitPrimitive(points, config);
        if (!fitted) {
            continue;
        }
        const boxVolume = boxVolumeOf(fitted);
        if (boxVolume < config.minVolumeMm3) {
            continue;
        }
        parts.push({ collider: fitted, boxVolume, points });
    }

    parts.sort(compareParts);

    let colliders: ColliderDefinition[];
    if (parts.length > config.maxColliders && Number.isFinite(config.maxColliders)) {
        const keep = Math.max(1, Math.floor(config.maxColliders));
        const retained = parts.slice(0, keep - 1 > 0 ? keep - 1 : keep);
        const merged = parts.slice(retained.length);
        colliders = retained.map((part) => part.collider);
        if (merged.length > 0) {
            colliders.push(aabbOf(merged.flatMap((part) => part.points)));
        }
    } else {
        colliders = parts.map((part) => part.collider);
    }

    return { colliders, componentCount: components.length };
}

/**
 * Compile all triangles of a model into the renderer's local millimetre frame
 * (`xRotation(PI) * scaling(0.4)`, matching WebGLCompiler) so fitted colliders
 * share the mesh's coordinate frame.
 */
export function collectCompiledTriangles(model: Model): Triangle3[] {
    const frame = m4.multiply(m4.xRotation(Math.PI), m4.scaling(0.4, 0.4, 0.4));
    const triangles: Triangle3[] = [];

    const pushVertex = (matrix: m4.Matrix4, vertex: Vertex): Vec3 => {
        const point = m4.transformVector(matrix, [vertex.x, vertex.y, vertex.z, 1]);
        return [point[0], point[1], point[2]];
    };

    const walk = (current: Model, matrix: m4.Matrix4, depth: number): void => {
        if (depth > 128) {
            return;
        }
        for (const triangle of current.triangles) {
            triangles.push([
                pushVertex(matrix, triangle.p1),
                pushVertex(matrix, triangle.p2),
                pushVertex(matrix, triangle.p3)
            ]);
        }
        for (const quad of current.quads) {
            const p1 = pushVertex(matrix, quad.p1);
            const p2 = pushVertex(matrix, quad.p2);
            const p3 = pushVertex(matrix, quad.p3);
            const p4 = pushVertex(matrix, quad.p4);
            triangles.push([p1, p2, p3]);
            triangles.push([p1, p3, p4]);
        }
        for (const subpart of current.subparts) {
            if (!subpart.model) {
                continue;
            }
            const child = m4.multiply(matrix, subpart.matrix);
            walk(subpart.model, child, depth + 1);
        }
    };

    walk(model, frame, 0);
    return triangles;
}

/**
 * Build an exact triangle-mesh collider from a model's compiled surface. This
 * preserves concave openings (for example a branch to drive under) exactly.
 * Best suited to fixed scenery; dynamic bodies should usually use `compound`.
 */
export function buildTrimeshCollider(model: Model): ColliderDefinition | undefined {
    const compiled = new WebGLCompiler().compileModel(model, {
        rescale: false,
        recenter: false
    });
    const triangleCount = compiled.triangles;
    if (triangleCount === 0) {
        return undefined;
    }
    const source = compiled.vertices;
    const start = compiled.triangleOffset;
    const verticesMm: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < triangleCount * 3; i++) {
        const base = (start + i) * 4;
        verticesMm.push(source[base], source[base + 1], source[base + 2]);
        indices.push(i);
    }
    return {
        shape: 'trimesh',
        verticesMm,
        indices,
        positionMm: { x: 0, y: 0, z: 0 }
    };
}

/**
 * Shift collider positions by an offset. Used when a mesh is compiled with
 * `recenter` so fitted colliders share the recentered mesh's frame.
 */
export function translateColliders(
    colliders: ColliderDefinition[],
    offset: PhysicsVector
): ColliderDefinition[] {
    if (offset.x === 0 && offset.y === 0 && offset.z === 0) {
        return colliders;
    }
    return colliders.map((collider) => {
        const base = collider.positionMm ?? { x: 0, y: 0, z: 0 };
        return {
            ...collider,
            positionMm: {
                x: base.x + offset.x,
                y: base.y + offset.y,
                z: base.z + offset.z
            }
        };
    });
}

/** Drive-wheel part numbers whose radius (mm) is known from the part geometry. */
export const ROBOT_WHEEL_RADIUS_MM: Record<string, number> = {
    '39367p01': 28,
    '49295p01': 44
};

export interface RobotColliderFitOptions {
    /** Wheel part (without `.dat`) to radius in mm. Defaults to the SPIKE wheels. */
    wheelRadiusMm?: Record<string, number>;
    /** Number of stacked chassis boxes along the dominant horizontal axis. */
    chassisLayers?: number;
    /** Share of the body mass placed on the wheels (0-1). */
    wheelMassFraction?: number;
    /** Total body mass in kg; when given, per-collider masses are assigned. */
    massKg?: number;
    /** Chassis slabs with a box volume below this (mm^3) are dropped. */
    minChassisVolumeMm3?: number;
    /**
     * Clearance (mm) the chassis floor is raised above the lowest wheel bottom
     * so the robot rides on its wheels instead of its belly.
     */
    chassisClearanceMm?: number;
}

export interface RobotColliderFitResult {
    colliders: ColliderDefinition[];
    wheelCount: number;
    chassisCount: number;
}

/**
 * Robot-specific collider fitter: one cylinder per drive wheel (correct ground
 * contact/friction) plus a small number of layered chassis boxes. This keeps
 * the collider count low and mass distribution explicit, unlike the generic
 * per-part compound fit which produces hundreds of colliders for a robot.
 */
export function fitRobotColliders(
    model: Model,
    options: RobotColliderFitOptions = {}
): RobotColliderFitResult {
    const wheelRadii = options.wheelRadiusMm ?? ROBOT_WHEEL_RADIUS_MM;
    const layers = Math.max(1, Math.floor(options.chassisLayers ?? 3));
    const wheelMassFraction = Math.min(Math.max(options.wheelMassFraction ?? 0.2, 0), 1);
    const minChassisVolume = options.minChassisVolumeMm3 ?? 100;

    const wheelColliders: ColliderDefinition[] = [];
    const chassisPoints: Vec3[] = [];
    const frame = m4.multiply(m4.xRotation(Math.PI), m4.scaling(0.4, 0.4, 0.4));

    const walk = (current: Model, matrix: m4.Matrix4): void => {
        for (const triangle of current.triangles) {
            pushLdrawTriangle(matrix, triangle, chassisPoints);
        }
        for (const quad of current.quads) {
            pushQuad(matrix, quad, chassisPoints);
        }
        for (const subpart of current.subparts) {
            if (!subpart.model) {
                continue;
            }
            const child = m4.multiply(matrix, subpart.matrix);
            const part = subpart.modelNumber.replace(/\.dat$/i, '').toLowerCase();
            const radius = wheelRadii[part];
            if (radius !== undefined) {
                const points: Vec3[] = [];
                gatherPoints(subpart.model, child, points);
                const collider = wheelColliderFromPoints(points, radius);
                if (collider) {
                    wheelColliders.push(collider);
                }
            } else {
                walk(subpart.model, child);
            }
        }
    };
    walk(model, frame);

    let floorY: number | undefined;
    if (wheelColliders.length > 0) {
        let lowestWheel = Number.POSITIVE_INFINITY;
        for (const collider of wheelColliders) {
            if (collider.shape === 'cylinder' || collider.shape === 'capsule') {
                const bottom = (collider.positionMm?.y ?? 0) - collider.radiusMm;
                if (bottom < lowestWheel) {
                    lowestWheel = bottom;
                }
            }
        }
        if (Number.isFinite(lowestWheel)) {
            floorY = lowestWheel + (options.chassisClearanceMm ?? 2);
        }
    }

    const chassisBoxes = layeredChassisBoxes(chassisPoints, layers, minChassisVolume, floorY);
    const colliders = [...chassisBoxes, ...wheelColliders];

    if (options.massKg !== undefined) {
        const wheelEach =
            wheelColliders.length > 0
                ? (options.massKg * wheelMassFraction) / wheelColliders.length
                : 0;
        const chassisEach =
            chassisBoxes.length > 0
                ? (options.massKg * (1 - wheelMassFraction)) / chassisBoxes.length
                : 0;
        for (const collider of colliders) {
            const isWheel = wheelColliders.includes(collider);
            collider.massKg = isWheel
                ? wheelEach || options.massKg / colliders.length
                : chassisEach || options.massKg / colliders.length;
        }
    }

    return {
        colliders,
        wheelCount: wheelColliders.length,
        chassisCount: chassisBoxes.length
    };
}

function pushVertex(matrix: m4.Matrix4, vertex: Vertex, out: Vec3[]): void {
    const transformed = m4.transformVector(matrix, [vertex.x, vertex.y, vertex.z, 1]);
    out.push([transformed[0], transformed[1], transformed[2]]);
}

function pushLdrawTriangle(matrix: m4.Matrix4, triangle: Triangle, out: Vec3[]): void {
    pushVertex(matrix, triangle.p1, out);
    pushVertex(matrix, triangle.p2, out);
    pushVertex(matrix, triangle.p3, out);
}

function pushQuad(matrix: m4.Matrix4, quad: Quad, out: Vec3[]): void {
    pushVertex(matrix, quad.p1, out);
    pushVertex(matrix, quad.p2, out);
    pushVertex(matrix, quad.p3, out);
    pushVertex(matrix, quad.p4, out);
}

function gatherPoints(current: Model, matrix: m4.Matrix4, out: Vec3[]): void {
    for (const triangle of current.triangles) {
        pushLdrawTriangle(matrix, triangle, out);
    }
    for (const quad of current.quads) {
        pushQuad(matrix, quad, out);
    }
    for (const subpart of current.subparts) {
        if (subpart.model) {
            gatherPoints(subpart.model, m4.multiply(matrix, subpart.matrix), out);
        }
    }
}

function wheelColliderFromPoints(
    points: Vec3[],
    knownRadius: number
): ColliderDefinition | undefined {
    if (points.length < 3) {
        return undefined;
    }
    const { min, max } = boundsOf(points);
    const extents: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const axle = indexOfMin(extents);
    const width = Math.max(extents[axle], 1);
    const radius =
        knownRadius > 0
            ? knownRadius
            : Math.max(extents[(axle + 1) % 3], extents[(axle + 2) % 3]) / 2;
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    return cylinderAlongAxis(center, radius, width, axle);
}

function cylinderAlongAxis(
    center: Vec3,
    radius: number,
    height: number,
    axis: number
): ColliderDefinition {
    const y: Vec3 = axis === 0 ? [1, 0, 0] : axis === 1 ? [0, 1, 0] : [0, 0, 1];
    const x = perpendicularTo(y) ?? [0, 0, 1];
    const z = normalize(cross(x, y)) ?? [0, 0, 1];
    const correctedX = normalize(cross(y, z)) ?? x;
    return {
        shape: 'cylinder',
        radiusMm: radius,
        heightMm: height,
        positionMm: vector(center),
        rotation: quaternionFromBasis(correctedX, y, z)
    };
}

function layeredChassisBoxes(
    points: Vec3[],
    layers: number,
    minVolumeMm3: number,
    floorY: number | undefined
): ColliderDefinition[] {
    if (points.length === 0) {
        return [];
    }
    const { min, max } = boundsOf(points);
    const axis = max[0] - min[0] >= max[2] - min[2] ? 0 : 2;
    const start = min[axis];
    const span = max[axis] - start;
    if (!(span > 0)) {
        return [];
    }
    const step = span / layers;
    const boxes: ColliderDefinition[] = [];
    for (let index = 0; index < layers; index++) {
        const low = start + index * step;
        const high = index === layers - 1 ? max[axis] : low + step;
        const slab = points.filter((point) =>
            index === layers - 1
                ? point[axis] >= low - 1e-6 && point[axis] <= high + 1e-6
                : point[axis] >= low - 1e-6 && point[axis] < high
        );
        if (slab.length === 0) {
            continue;
        }
        const slabBounds = boundsOf(slab);
        const bottom =
            floorY !== undefined ? Math.max(slabBounds.min[1], floorY) : slabBounds.min[1];
        const top = slabBounds.max[1];
        if (top <= bottom) {
            continue;
        }
        const size: Vec3 = [
            Math.max(1, slabBounds.max[0] - slabBounds.min[0]),
            Math.max(1, top - bottom),
            Math.max(1, slabBounds.max[2] - slabBounds.min[2])
        ];
        if (size[0] * size[1] * size[2] < minVolumeMm3) {
            continue;
        }
        const center: Vec3 = [
            (slabBounds.min[0] + slabBounds.max[0]) / 2,
            (bottom + top) / 2,
            (slabBounds.min[2] + slabBounds.max[2]) / 2
        ];
        boxes.push({ shape: 'box', sizeMm: vector(size), positionMm: vector(center) });
    }
    return boxes;
}

function indexOfMin(values: Vec3): number {
    let best = 0;
    for (let index = 1; index < values.length; index++) {
        if (values[index] < values[best]) {
            best = index;
        }
    }
    return best;
}

function boundsOf(points: Vec3[]): { min: Vec3; max: Vec3 } {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const point of points) {
        for (let axis = 0; axis < 3; axis++) {
            if (point[axis] < min[axis]) min[axis] = point[axis];
            if (point[axis] > max[axis]) max[axis] = point[axis];
        }
    }
    return { min, max };
}

interface ComponentBounds {
    points: Vec3[];
    min: Vec3;
    max: Vec3;
}

function axisGap(aMin: number, aMax: number, bMin: number, bMax: number): number {
    if (aMax < bMin) return bMin - aMax;
    if (bMax < aMin) return aMin - bMax;
    return 0;
}

function aabbGap(a: ComponentBounds, b: ComponentBounds): number {
    const dx = axisGap(a.min[0], a.max[0], b.min[0], b.max[0]);
    const dy = axisGap(a.min[1], a.max[1], b.min[1], b.max[1]);
    const dz = axisGap(a.min[2], a.max[2], b.min[2], b.max[2]);
    return Math.hypot(dx, dy, dz);
}

function dedupePoints(points: Vec3[], tolerance: number): Vec3[] {
    const safe = Math.max(tolerance, 1e-6);
    const seen = new Set<string>();
    const unique: Vec3[] = [];
    for (const point of points) {
        const key = `${Math.round(point[0] / safe)},${Math.round(point[1] / safe)},${Math.round(
            point[2] / safe
        )}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(point);
        }
    }
    return unique;
}

/**
 * Agglomerate connected parts whose bounding boxes are within `distanceMm`,
 * respecting `maxParts` per cluster. Greedy by smallest AABB gap for stable,
 * compact clusters.
 */
function clusterComponents(
    data: ComponentBounds[],
    distanceMm: number,
    maxParts: number,
    tolerance: number
): Vec3[][] {
    const count = data.length;
    const parent = data.map((_, index) => index);
    const sizes = data.map(() => 1);
    const find = (value: number): number => {
        let root = value;
        while (parent[root] !== root) {
            parent[root] = parent[parent[root]];
            root = parent[root];
        }
        return root;
    };

    if (distanceMm > 0 && count > 1) {
        const pairs: { i: number; j: number; gap: number }[] = [];
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                pairs.push({ i, j, gap: aabbGap(data[i], data[j]) });
            }
        }
        pairs.sort((a, b) => a.gap - b.gap || a.i - b.i || a.j - b.j);
        for (const pair of pairs) {
            if (pair.gap > distanceMm) {
                break;
            }
            const rootI = find(pair.i);
            const rootJ = find(pair.j);
            if (rootI === rootJ) {
                continue;
            }
            if (sizes[rootI] + sizes[rootJ] > maxParts) {
                continue;
            }
            parent[rootJ] = rootI;
            sizes[rootI] += sizes[rootJ];
        }
    }

    const groups = new Map<number, Vec3[]>();
    for (let i = 0; i < count; i++) {
        const root = find(i);
        let group = groups.get(root);
        if (!group) {
            group = [];
            groups.set(root, group);
        }
        group.push(...data[i].points);
    }
    return [...groups.values()].map((points) => dedupePoints(points, tolerance));
}

function connectedComponents(triangles: Triangle3[], tolerance: number): number[][] {
    const parent: number[] = [];

    const find = (value: number): number => {
        let root = value;
        while (parent[root] !== root) {
            parent[root] = parent[parent[root]];
            root = parent[root];
        }
        return root;
    };
    const union = (a: number, b: number): void => {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) {
            parent[rootB] = rootA;
        }
    };

    const toleranceSafe = Math.max(tolerance, 1e-6);
    const vertices = new Map<string, number>();
    const vertexId = (point: Vec3): number => {
        const key = `${Math.round(point[0] / toleranceSafe)},${Math.round(
            point[1] / toleranceSafe
        )},${Math.round(point[2] / toleranceSafe)}`;
        let id = vertices.get(key);
        if (id === undefined) {
            id = parent.length;
            parent.push(id);
            vertices.set(key, id);
        }
        return id;
    };

    const triangleRoot: number[] = new Array(triangles.length);
    for (let i = 0; i < triangles.length; i++) {
        const [a, b, c] = triangles[i];
        const idA = vertexId(a);
        const idB = vertexId(b);
        const idC = vertexId(c);
        union(idA, idB);
        union(idA, idC);
        triangleRoot[i] = idA;
    }

    const groups = new Map<number, number[]>();
    for (let i = 0; i < triangles.length; i++) {
        const root = find(triangleRoot[i]);
        let group = groups.get(root);
        if (!group) {
            group = [];
            groups.set(root, group);
        }
        group.push(i);
    }
    return [...groups.values()];
}

function componentPoints(indices: number[], triangles: Triangle3[], tolerance: number): Vec3[] {
    const safe = Math.max(tolerance, 1e-6);
    const seen = new Set<string>();
    const points: Vec3[] = [];
    for (const index of indices) {
        for (const point of triangles[index]) {
            const key = `${Math.round(point[0] / safe)},${Math.round(point[1] / safe)},${Math.round(
                point[2] / safe
            )}`;
            if (!seen.has(key)) {
                seen.add(key);
                points.push(point);
            }
        }
    }
    return points;
}

function fitPrimitive(
    points: Vec3[],
    config: Required<ColliderFitOptions>
): ColliderDefinition | undefined {
    if (points.length < 3) {
        return undefined;
    }

    const centroid = vecScale(
        points.reduce((sum, p) => vecAdd(sum, p), [0, 0, 0]),
        1 / points.length
    );
    const covariance = covarianceOf(points, centroid);
    const eigen = jacobiEigen(covariance);

    const basis = orthonormalBasis(eigen.vectors);
    if (!basis) {
        return undefined;
    }
    const [e1, e2, e3] = basis;

    const extents = extentsAlong(points, centroid, [e1, e2, e3]);
    if (extents.size.some((value) => !Number.isFinite(value))) {
        return undefined;
    }

    const center = addVectors(
        centroid,
        addVectors(
            vecScale(e1, extents.mid[0]),
            addVectors(vecScale(e2, extents.mid[1]), vecScale(e3, extents.mid[2]))
        )
    );

    const half = extents.size.map((value) => Math.max(value / 2, 0.5));
    const size: Vec3 = [half[0] * 2, half[1] * 2, half[2] * 2];

    if (config.boxOnly) {
        return boxCollider(center, size, e1, e2, e3);
    }

    const major = indexOfMax(half);
    const crossAxes = [0, 1, 2].filter((axis) => axis !== major);
    const crossHalf = crossAxes.map((axis) => half[axis]);

    // Reject strongly non-square cross-sections: they cannot be a round shaft.
    const circular =
        Math.abs(crossHalf[0] - crossHalf[1]) / Math.max(crossHalf[0], crossHalf[1], 1e-6) <=
        config.circularTolerance;

    if (circular) {
        const majorAxis = [e1, e2, e3][major];
        const crossBasis = crossAxes.map((axis) => [e1, e2, e3][axis] as Vec3);
        const radial = radialStats(points, center, majorAxis, crossBasis);
        if (radial) {
            const maxCrossHalf = Math.max(crossHalf[0], crossHalf[1], 1e-6);
            const roundness = radial.max / maxCrossHalf;
            const isCylinder = roundness <= 1 + config.circularTolerance;

            if (isCylinder) {
                const height = size[major];
                const boxVol = size[0] * size[1] * size[2];
                const cylinderVol = Math.PI * radial.max * radial.max * height;
                const rounded = radial.endMax < radial.max * (1 - config.capsuleEndTolerance);
                const capsuleHeight = height - 2 * radial.max;

                if (rounded && capsuleHeight > 0.5) {
                    const capsuleVol =
                        cylinderVol + (4 / 3) * Math.PI * radial.max * radial.max * radial.max;
                    if (capsuleVol < boxVol) {
                        return capsuleCollider(
                            center,
                            radial.max,
                            capsuleHeight,
                            majorAxis,
                            crossBasis
                        );
                    }
                }
                if (cylinderVol < boxVol) {
                    return cylinderCollider(center, radial.max, height, majorAxis, crossBasis);
                }
            }
        }
    }

    return boxCollider(center, size, e1, e2, e3);
}

function boxCollider(center: Vec3, size: Vec3, e1: Vec3, e2: Vec3, e3: Vec3): ColliderDefinition {
    return {
        shape: 'box',
        sizeMm: vector(size),
        positionMm: vector(center),
        rotation: quaternionFromBasis(e1, e2, e3)
    };
}

function cylinderCollider(
    center: Vec3,
    radius: number,
    height: number,
    majorAxis: Vec3,
    crossBasis: Vec3[]
): ColliderDefinition {
    const [y, x, z] = orientForLocalY(majorAxis, crossBasis);
    return {
        shape: 'cylinder',
        radiusMm: radius,
        heightMm: height,
        positionMm: vector(center),
        rotation: quaternionFromBasis(x, y, z)
    };
}

function capsuleCollider(
    center: Vec3,
    radius: number,
    height: number,
    majorAxis: Vec3,
    crossBasis: Vec3[]
): ColliderDefinition {
    const [y, x, z] = orientForLocalY(majorAxis, crossBasis);
    return {
        shape: 'capsule',
        radiusMm: radius,
        heightMm: height,
        positionMm: vector(center),
        rotation: quaternionFromBasis(x, y, z)
    };
}

function aabbOf(points: Vec3[]): ColliderDefinition {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const point of points) {
        for (let axis = 0; axis < 3; axis++) {
            if (point[axis] < min[axis]) min[axis] = point[axis];
            if (point[axis] > max[axis]) max[axis] = point[axis];
        }
    }
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const size: Vec3 = [
        Math.max(max[0] - min[0], 1),
        Math.max(max[1] - min[1], 1),
        Math.max(max[2] - min[2], 1)
    ];
    return { shape: 'box', sizeMm: vector(size), positionMm: vector(center) };
}

function compareParts(
    a: { boxVolume: number; collider: ColliderDefinition },
    b: { boxVolume: number; collider: ColliderDefinition }
): number {
    if (a.boxVolume !== b.boxVolume) {
        return b.boxVolume - a.boxVolume;
    }
    const ca = a.collider.positionMm ?? { x: 0, y: 0, z: 0 };
    const cb = b.collider.positionMm ?? { x: 0, y: 0, z: 0 };
    return (
        ca.x - cb.x ||
        ca.y - cb.y ||
        ca.z - cb.z ||
        a.collider.shape.localeCompare(b.collider.shape)
    );
}

function boxVolumeOf(collider: ColliderDefinition): number {
    if (collider.shape === 'box') {
        return collider.sizeMm.x * collider.sizeMm.y * collider.sizeMm.z;
    }
    if (collider.shape === 'trimesh') {
        return Number.POSITIVE_INFINITY;
    }
    const radius = collider.radiusMm;
    const cylinder = Math.PI * radius * radius * collider.heightMm;
    if (collider.shape === 'capsule') {
        return cylinder + (4 / 3) * Math.PI * radius * radius * radius;
    }
    return cylinder;
}

interface Extents {
    mid: Vec3;
    size: Vec3;
}

function extentsAlong(points: Vec3[], origin: Vec3, axes: Vec3[]): Extents {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const point of points) {
        const relative = vecSub(point, origin);
        for (let axis = 0; axis < 3; axis++) {
            const projection = dot(relative, axes[axis]);
            if (projection < min[axis]) min[axis] = projection;
            if (projection > max[axis]) max[axis] = projection;
        }
    }
    return {
        mid: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
        size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
    };
}

interface RadialStats {
    max: number;
    endMax: number;
}

function radialStats(
    points: Vec3[],
    center: Vec3,
    axis: Vec3,
    crossBasis: Vec3[]
): RadialStats | undefined {
    let max = 0;
    let axialMax = 0;
    const relative: { radial: number; axial: number }[] = [];
    for (const point of points) {
        const d = vecSub(point, center);
        const axial = dot(d, axis);
        const r = Math.hypot(dot(d, crossBasis[0]), dot(d, crossBasis[1]));
        if (r > max) max = r;
        if (Math.abs(axial) > axialMax) axialMax = Math.abs(axial);
        relative.push({ radial: r, axial: Math.abs(axial) });
    }
    if (max <= 1e-6 || axialMax <= 1e-6) {
        return undefined;
    }
    const cutoff = axialMax * 0.9;
    let endMax = 0;
    let sawEnd = false;
    for (const entry of relative) {
        if (entry.axial >= cutoff) {
            sawEnd = true;
            if (entry.radial > endMax) endMax = entry.radial;
        }
    }
    if (!sawEnd) {
        endMax = max;
    }
    return { max, endMax };
}

function covarianceOf(points: Vec3[], centroid: Vec3): number[][] {
    const covariance = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    for (const point of points) {
        const d = vecSub(point, centroid);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                covariance[i][j] += d[i] * d[j];
            }
        }
    }
    const scale = 1 / points.length;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            covariance[i][j] *= scale;
        }
    }
    return covariance;
}

/** Jacobi eigen-decomposition for a symmetric 3x3 matrix. Deterministic. */
function jacobiEigen(input: number[][]): { values: number[]; vectors: Vec3[] } {
    const a = [[...input[0]], [...input[1]], [...input[2]]];
    const v = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];

    for (let iteration = 0; iteration < 64; iteration++) {
        let p = 0;
        let q = 1;
        let max = Math.abs(a[0][1]);
        if (Math.abs(a[0][2]) > max) {
            max = Math.abs(a[0][2]);
            p = 0;
            q = 2;
        }
        if (Math.abs(a[1][2]) > max) {
            max = Math.abs(a[1][2]);
            p = 1;
            q = 2;
        }
        if (max < 1e-12) {
            break;
        }

        const app = a[p][p];
        const aqq = a[q][q];
        const apq = a[p][q];
        const theta = (aqq - app) / (2 * apq);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;

        for (let k = 0; k < 3; k++) {
            const akp = a[k][p];
            const akq = a[k][q];
            a[k][p] = c * akp - s * akq;
            a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 3; k++) {
            const apk = a[p][k];
            const aqk = a[q][k];
            a[p][k] = c * apk - s * aqk;
            a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 3; k++) {
            const vkp = v[k][p];
            const vkq = v[k][q];
            v[k][p] = c * vkp - s * vkq;
            v[k][q] = s * vkp + c * vkq;
        }
    }

    const entries = [0, 1, 2].map((index) => ({
        value: a[index][index],
        vector: [v[0][index], v[1][index], v[2][index]] as Vec3
    }));
    entries.sort((first, second) => second.value - first.value);
    return {
        values: entries.map((entry) => entry.value),
        vectors: entries.map((entry) => normalize(entry.vector) ?? [1, 0, 0])
    };
}

function orthonormalBasis(vectors: Vec3[]): [Vec3, Vec3, Vec3] | undefined {
    const e1 = normalize(vectors[0]);
    if (!e1) {
        return undefined;
    }
    let e2 = vectors[1] ? subtractProjection(vectors[1], e1) : undefined;
    e2 = e2 ? normalize(e2) : undefined;
    if (!e2) {
        e2 = perpendicularTo(e1);
    }
    if (!e2) {
        return undefined;
    }
    const e3 = normalize(cross(e1, e2));
    if (!e3) {
        return undefined;
    }
    return [e1, e2, e3];
}

function orientForLocalY(majorAxis: Vec3, crossBasis: Vec3[]): [Vec3, Vec3, Vec3] {
    const y = normalize(majorAxis) ?? [0, 1, 0];
    let x = crossBasis[0] ? subtractProjection(crossBasis[0], y) : undefined;
    x = x ? normalize(x) : undefined;
    if (!x) {
        x = perpendicularTo(y);
    }
    if (!x) {
        x = [1, 0, 0];
    }
    const z = normalize(cross(x, y)) ?? normalize(cross(y, x)) ?? [0, 0, 1];
    const correctedX = normalize(cross(y, z)) ?? x;
    return [y, correctedX, z];
}

export function quaternionFromBasis(e1: Vec3, e2: Vec3, e3: Vec3): PhysicsQuaternion {
    const r00 = e1[0];
    const r01 = e2[0];
    const r02 = e3[0];
    const r10 = e1[1];
    const r11 = e2[1];
    const r12 = e3[1];
    const r20 = e1[2];
    const r21 = e2[2];
    const r22 = e3[2];

    const trace = r00 + r11 + r22;
    let x: number;
    let y: number;
    let z: number;
    let w: number;
    if (trace > 0) {
        const s = Math.sqrt(trace + 1) * 2;
        w = 0.25 * s;
        x = (r21 - r12) / s;
        y = (r02 - r20) / s;
        z = (r10 - r01) / s;
    } else if (r00 > r11 && r00 > r22) {
        const s = Math.sqrt(1 + r00 - r11 - r22) * 2;
        w = (r21 - r12) / s;
        x = 0.25 * s;
        y = (r01 + r10) / s;
        z = (r02 + r20) / s;
    } else if (r11 > r22) {
        const s = Math.sqrt(1 + r11 - r00 - r22) * 2;
        w = (r02 - r20) / s;
        x = (r01 + r10) / s;
        y = 0.25 * s;
        z = (r12 + r21) / s;
    } else {
        const s = Math.sqrt(1 + r22 - r00 - r11) * 2;
        w = (r10 - r01) / s;
        x = (r02 + r20) / s;
        y = (r12 + r21) / s;
        z = 0.25 * s;
    }
    const length = Math.hypot(x, y, z, w);
    if (length < 1e-9) {
        return { x: 0, y: 0, z: 0, w: 1 };
    }
    x /= length;
    y /= length;
    z /= length;
    w /= length;
    if (w < 0) {
        x = -x;
        y = -y;
        z = -z;
        w = -w;
    }
    return { x, y, z, w };
}

function vector(value: Vec3): PhysicsVector {
    return { x: value[0], y: value[1], z: value[2] };
}

function indexOfMax(values: number[]): number {
    let best = 0;
    for (let i = 1; i < values.length; i++) {
        if (values[i] > values[best]) {
            best = i;
        }
    }
    return best;
}

function addVectors(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecSub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecScale(a: Vec3, scale: number): Vec3 {
    return [a[0] * scale, a[1] * scale, a[2] * scale];
}

function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function subtractProjection(vectorToProject: Vec3, axis: Vec3): Vec3 {
    return vecSub(vectorToProject, vecScale(axis, dot(vectorToProject, axis)));
}

function normalize(value: Vec3): Vec3 | undefined {
    const length = Math.hypot(value[0], value[1], value[2]);
    if (length < 1e-9) {
        return undefined;
    }
    return [value[0] / length, value[1] / length, value[2] / length];
}

function perpendicularTo(axis: Vec3): Vec3 | undefined {
    const reference: Vec3 = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return normalize(cross(axis, reference));
}
