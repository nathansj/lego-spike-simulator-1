import { brickColour, resolveSubpart, type Model, type Subpart } from '$lib/ldraw/components';
import type { DriveDefinition, PhysicsDefinition } from '$lib/physics/types';

export const VIRTUAL_REFERENCE_ROBOT = {
    profileVersion: 1,
    id: 'bioglow-virtual-reference-robot',
    status: 'design-target-uncalibrated',
    purpose: 'A modular simulator reference robot for BIOGLOW mission planning.',
    chassis: {
        widthMm: 180,
        lengthMm: 220,
        heightMm: 120,
        massKg: 1,
        wheelDiameterMm: 56,
        trackWidthMm: 144,
        drivePorts: {
            left: 'A',
            right: 'B'
        }
    },
    attachmentInterface: {
        location: 'front-center',
        widthMm: 80,
        mountingHoleSpacingMm: 40,
        poweredPorts: ['C', 'D'],
        designRules: [
            'Keep the attachment inside the chassis width when possible.',
            'Use passive alignment features before powered actuation.',
            'Keep mission-specific geometry replaceable and independently testable.'
        ]
    },
    attachmentProfiles: [
        { id: 'front-pusher', purpose: 'push or press mission actuators' },
        { id: 'side-hook', purpose: 'pull handles, loops, or flexible elements' },
        { id: 'lift-and-rotate', purpose: 'raise, rotate, or reset mission mechanisms' },
        { id: 'collector', purpose: 'retain or transport loose mission pieces' }
    ]
} as const;

export const VIRTUAL_REFERENCE_ROBOT_LDRAW_PARTS = [
    '32555.dat',
    '3895.dat',
    '54696.dat',
    '39367p01.dat'
] as const;

export const VIRTUAL_REFERENCE_ROBOT_LIBRARY_VERIFICATION = {
    verifiedOn: '2026-09-12',
    requiredParts: VIRTUAL_REFERENCE_ROBOT_LDRAW_PARTS,
    archives: [
        {
            path: '/Users/Sheldon/Downloads/ldraw.zip',
            status: 'all-required-parts-present'
        },
        {
            path: '/Users/Sheldon/Downloads/ldrawunf.zip',
            status: 'required-parts-not-present'
        },
        {
            path: '/Users/Sheldon/Downloads/complete.zip',
            status: 'all-required-parts-present'
        }
    ],
    resolutionPolicy:
        'The simulator resolves these part IDs from the loaded LDraw library; fallback geometry is used only when a library component has not been loaded.'
} as const;

export function createVirtualReferenceRobotPhysics(): PhysicsDefinition {
    const { widthMm, lengthMm, heightMm, massKg } = VIRTUAL_REFERENCE_ROBOT.chassis;
    return {
        bodyType: 'dynamic',
        massKg,
        friction: 0.7,
        restitution: 0,
        enabledRotations: { x: false, y: true, z: false },
        colliders: [
            {
                shape: 'box',
                sizeMm: { x: widthMm, y: heightMm, z: lengthMm }
            }
        ]
    };
}

export function createVirtualReferenceRobotDrive(): DriveDefinition {
    const { wheelDiameterMm, trackWidthMm, drivePorts } = VIRTUAL_REFERENCE_ROBOT.chassis;
    return {
        wheelDiameterMm,
        trackWidthMm,
        leftPort: drivePorts.left,
        rightPort: drivePorts.right
    };
}

function boxTriangles(
    widthMm: number,
    heightMm: number,
    lengthMm: number,
    colour: ReturnType<typeof brickColour>
) {
    const x = widthMm / 2;
    const y = heightMm / 2;
    const z = lengthMm / 2;
    const vertices = [
        { x: -x, y: -y, z: -z },
        { x, y: -y, z: -z },
        { x, y, z: -z },
        { x: -x, y, z: -z },
        { x: -x, y: -y, z: z },
        { x, y: -y, z: z },
        { x, y, z: z },
        { x: -x, y, z: z }
    ];
    const faces = [
        [0, 1, 2, 3],
        [4, 7, 6, 5],
        [0, 4, 5, 1],
        [3, 2, 6, 7],
        [1, 5, 6, 2],
        [0, 3, 7, 4]
    ];
    return faces.flatMap(([a, b, c, d]) => [
        { colour, p1: vertices[a], p2: vertices[b], p3: vertices[c] },
        { colour, p1: vertices[a], p2: vertices[c], p3: vertices[d] }
    ]);
}

function identityMatrix(): number[] {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function matrixAt(x: number, y: number, z: number, rotation = identityMatrix()): number[] {
    return [...rotation.slice(0, 12), x, y, z, 1];
}

const beamAlongZ = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0];
const wheelOnSide = [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0];

export function createVirtualReferenceRobotModel(): Model {
    const fallbackModels = {
        beam: {
            name: 'fallback-technic-liftarm.ldr',
            subparts: [],
            lines: [],
            triangles: boxTriangles(176, 16, 16, brickColour('7')),
            quads: [],
            optionalLines: []
        } as Model,
        motor: {
            name: 'fallback-spike-motor.ldr',
            subparts: [],
            lines: [],
            triangles: boxTriangles(32, 28, 48, brickColour('1')),
            quads: [],
            optionalLines: []
        } as Model,
        wheel: {
            name: 'fallback-spike-wheel.ldr',
            subparts: [],
            lines: [],
            triangles: boxTriangles(12, 56, 56, brickColour('26')),
            quads: [],
            optionalLines: []
        } as Model
    };

    const part = (
        id: number,
        modelNumber: string,
        matrix: number[],
        fallback: Model,
        colour: ReturnType<typeof brickColour>,
        port?: 'A' | 'B' | 'C' | 'D'
    ): Subpart => {
        const subpart: Subpart = {
            id,
            colour,
            matrix,
            model: fallback,
            modelNumber,
            port: port ? { hub: 'virtual-reference-hub', port } : undefined
        };
        resolveSubpart(subpart);
        return subpart;
    };

    const model: Model = {
        name: 'bioglow-virtual-reference-robot.ldr',
        subparts: [
            part(
                -1,
                '3895.dat',
                matrixAt(-58, 32, 0, beamAlongZ),
                fallbackModels.beam,
                brickColour('7')
            ),
            part(
                -2,
                '3895.dat',
                matrixAt(58, 32, 0, beamAlongZ),
                fallbackModels.beam,
                brickColour('7')
            ),
            part(-3, '32555.dat', matrixAt(0, 12, -70), fallbackModels.beam, brickColour('7')),
            part(-4, '32555.dat', matrixAt(0, 12, 70), fallbackModels.beam, brickColour('7')),
            part(
                -5,
                '54696.dat',
                matrixAt(-72, 28, 0),
                fallbackModels.motor,
                brickColour('1'),
                'A'
            ),
            part(-6, '54696.dat', matrixAt(72, 28, 0), fallbackModels.motor, brickColour('1'), 'B'),
            part(
                -7,
                '39367p01.dat',
                matrixAt(-72, 28, 0, wheelOnSide),
                fallbackModels.wheel,
                brickColour('26'),
                'A'
            ),
            part(
                -8,
                '39367p01.dat',
                matrixAt(72, 28, 0, wheelOnSide),
                fallbackModels.wheel,
                brickColour('26'),
                'B'
            ),
            part(
                -9,
                '54696.dat',
                matrixAt(-28, 52, -88, beamAlongZ),
                fallbackModels.motor,
                brickColour('1'),
                'C'
            ),
            part(
                -10,
                '54696.dat',
                matrixAt(28, 52, -88, beamAlongZ),
                fallbackModels.motor,
                brickColour('1'),
                'D'
            ),
            part(
                -11,
                '3895.dat',
                matrixAt(-28, 42, -126, beamAlongZ),
                fallbackModels.beam,
                brickColour('4')
            ),
            part(
                -12,
                '3895.dat',
                matrixAt(28, 42, -126, beamAlongZ),
                fallbackModels.beam,
                brickColour('4')
            ),
            part(-13, '32555.dat', matrixAt(0, 26, -112), fallbackModels.beam, brickColour('4')),
            part(-14, '3895.dat', matrixAt(0, 50, -142), fallbackModels.beam, brickColour('2'))
        ],
        lines: [],
        triangles: [],
        quads: [],
        optionalLines: []
    };
    return model;
}
