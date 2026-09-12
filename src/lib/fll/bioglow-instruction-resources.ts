export const BIOGLOW_INSTRUCTION_RESOURCE_BASE_URL =
    'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-text-based-bi-' as const;

const instructionResources = [
    ['M01', 'Drone Survey', '01', 8],
    ['M02', 'Exploding Seeds', '02', 6],
    ['M03', 'Flip the Rock', '03', 10],
    ['M04', 'Lucky Leaves', '04', 5],
    ['M05', 'Reaching Rods', '05', 7],
    ['M06', 'Leafcutter Frenzy', '06', 15],
    ['M07', 'Humongous Fungus', '06', 15],
    ['M08', 'Tangled', '07', 26],
    ['M09', 'Research Platform', '07', 26],
    ['M10', 'Fragile Microhabitats', '08', 6],
    ['M11', 'Window to the Past', '09', 8],
    ['M12', 'Forest Elder', '10', 8],
    ['M13', 'Keystone Species', '11', 9],
    ['M14', 'Seeds of Renewal', '12', 7],
    ['M15', 'Biocentric Architecture', '13', 15]
] as const;

export interface BioglowInstructionResource {
    missionId: (typeof instructionResources)[number][0];
    missionName: (typeof instructionResources)[number][1];
    bookletNumber: (typeof instructionResources)[number][2];
    pageCount: (typeof instructionResources)[number][3];
    url: string;
    evidenceBoundary: string;
}

export const BIOGLOW_INSTRUCTION_RESOURCE_RECORD: readonly BioglowInstructionResource[] =
    instructionResources.map(([missionId, missionName, bookletNumber, pageCount]) => ({
        missionId,
        missionName,
        bookletNumber,
        pageCount,
        url: `${BIOGLOW_INSTRUCTION_RESOURCE_BASE_URL}${bookletNumber}.pdf`,
        evidenceBoundary:
            'Build instructions support construction and visible assembly identification; they do not establish calibrated physics, masses, friction, joint limits, force, or contact tolerances.'
    }));

export function findBioglowInstructionResource(
    missionId: string
): BioglowInstructionResource | undefined {
    return BIOGLOW_INSTRUCTION_RESOURCE_RECORD.find((resource) => resource.missionId === missionId);
}
