import {
    BIOGLOW_INSTRUCTION_RESOURCE_RECORD,
    type BioglowInstructionResource
} from '$lib/fll/bioglow-instruction-resources';

export type InstructionMechanicsClaimKind = 'construction-observation' | 'physics-unresolved';

export interface InstructionMechanicsClaim {
    kind: InstructionMechanicsClaimKind;
    statement: string;
}

export interface BioglowInstructionMechanicsRecord {
    resource: BioglowInstructionResource;
    claims: readonly InstructionMechanicsClaim[];
    evidenceBoundary: string;
}

const claimsByMission: Record<string, readonly InstructionMechanicsClaim[]> = {
    M01: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct axle-connected rotating assemblies and a stand/dish assembly.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish a calibrated rotation axis, limit, friction, or scoring pose.'
        }
    ],
    M02: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct seed assemblies with sliding rings, flexible tubes, and a central stem.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish which assembled pieces are the three scored seeds, release force, contact tolerance, or reset dynamics.'
        }
    ],
    M03: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct a rotating platform and lever-like liftarm assemblies.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish the platform pivot, travel limits, or trigger calibration.'
        }
    ],
    M04: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct three angled leaf assemblies and handlebar/loop structures.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish valid leaf states, contact tolerances, or independent body boundaries.'
        }
    ],
    M05: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct a tree-like model with a trunk extension and axle-connected assemblies.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish slider or rotation limits, anchors, or scoring-state calibration.'
        }
    ],
    M06: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct a rack-gear assembly that slides in a base slot and meshes with a gear, plus a leaf-cutter ant sub-build.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish gear backlash, release forces, collision filtering, or calibrated travel.'
        }
    ],
    M07: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions share booklet 06 with M06 and identify a Humongous Fungus mission build beginning at a later step.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish M07 body partitions, motion limits, or contact tolerances.'
        }
    ],
    M08: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions share booklet 07 with M09 and construct a tree with multiple root assemblies and lever elements.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish flexible-link representation, root motion limits, or trigger calibration.'
        }
    ],
    M09: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions share booklet 07 with M08 and include three researcher sub-builds and a research platform.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish platform travel, payload body identities, or release mechanics.'
        }
    ],
    M10: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct spiderweb and worm sub-builds with axle and liftarm assemblies.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish habitat protection boundaries, contact tolerances, or scoring-state calibration.'
        }
    ],
    M11: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct a root assembly and a hinged door/root-cover assembly.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish hinge anchors, end-state tolerance, or reset repeatability.'
        }
    ],
    M12: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct a tree with rotating branches, supports, and a chain-connected assembly.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish branch pivots, chain dynamics, or calibrated return behavior.'
        }
    ],
    M13: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct an insert whose vertical movement causes four liftarms to pop up and down.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish insert travel, liftarm limits, trigger thresholds, or scoring contact tolerance.'
        }
    ],
    M14: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct rotating and sliding liftarm assemblies for Seeds of Renewal.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish body identities, axis registration, travel limits, or calibrated mechanics.'
        }
    ],
    M15: [
        {
            kind: 'construction-observation',
            statement:
                'The instructions construct a building with a crank, sliding window pane, and hinged assemblies.'
        },
        {
            kind: 'physics-unresolved',
            statement:
                'The instructions do not establish crank transmission, hinge limits, body partition, or scoring-state tolerance.'
        }
    ]
};

export const BIOGLOW_INSTRUCTION_MECHANICS_RECORD: readonly BioglowInstructionMechanicsRecord[] =
    BIOGLOW_INSTRUCTION_RESOURCE_RECORD.map((resource) => ({
        resource,
        claims: claimsByMission[resource.missionId],
        evidenceBoundary:
            'These claims summarize construction instructions only. They are not official physics specifications and require visual review, physical measurement, and calibration before mechanics admission.'
    }));

export function findBioglowInstructionMechanicsRecord(
    missionId: string
): BioglowInstructionMechanicsRecord | undefined {
    return BIOGLOW_INSTRUCTION_MECHANICS_RECORD.find(
        ({ resource }) => resource.missionId === missionId
    );
}
