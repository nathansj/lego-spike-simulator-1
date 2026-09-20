export interface PracticeRunReadiness {
    seasonReady: boolean;
    fieldReady: boolean;
    robotReady: boolean;
    driveReady: boolean;
    programReady: boolean;
}

export function isPracticeRunReady(readiness: PracticeRunReadiness): boolean {
    return Object.values(readiness).every(Boolean);
}

export function shouldStartResetRun(
    hasSimulation: boolean,
    runSimulation: boolean,
    practiceReady: boolean
): boolean {
    return !hasSimulation && !runSimulation && practiceReady;
}
