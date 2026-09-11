import {
    scoreDroneSurvey,
    type DroneSurveyObservation,
    type DroneSurveyScore
} from '$lib/fll/drone-survey';

export type MatchLifecycle = 'idle' | 'running' | 'finished';

export type DroneSurveyObservationFactory = () => DroneSurveyObservation;

export class DroneSurveyMatchController {
    private lifecycle: MatchLifecycle = 'idle';
    private elapsedSimulationTimeSeconds = 0;
    private finishedScore: DroneSurveyScore | undefined;

    constructor(private readonly observationFactory: DroneSurveyObservationFactory) {}

    get state(): MatchLifecycle {
        return this.lifecycle;
    }

    get elapsedFixedSimulationTimeSeconds(): number {
        return this.elapsedSimulationTimeSeconds;
    }

    get finalScore(): DroneSurveyScore | undefined {
        return this.lifecycle === 'finished' ? this.finishedScore : undefined;
    }

    start(): void {
        if (this.lifecycle !== 'idle') {
            throw new Error(`Cannot start a match while it is ${this.lifecycle}`);
        }

        this.elapsedSimulationTimeSeconds = 0;
        this.finishedScore = undefined;
        this.lifecycle = 'running';
    }

    setElapsedFixedSimulationTime(elapsedSimulationTimeSeconds: number): void {
        if (this.lifecycle !== 'running') {
            throw new Error(
                `Cannot update elapsed simulation time while the match is ${this.lifecycle}`
            );
        }
        if (!Number.isFinite(elapsedSimulationTimeSeconds) || elapsedSimulationTimeSeconds < 0) {
            throw new RangeError(
                'Elapsed fixed simulation time must be a finite, nonnegative number'
            );
        }
        if (elapsedSimulationTimeSeconds < this.elapsedSimulationTimeSeconds) {
            throw new RangeError(
                'Elapsed fixed simulation time cannot move backwards during a match'
            );
        }

        this.elapsedSimulationTimeSeconds = elapsedSimulationTimeSeconds;
    }

    finish(): DroneSurveyScore {
        if (this.lifecycle !== 'running') {
            throw new Error(`Cannot finish a match while it is ${this.lifecycle}`);
        }

        const score = scoreDroneSurvey(this.observationFactory());
        this.finishedScore = score;
        this.lifecycle = 'finished';
        return score;
    }

    reset(): void {
        this.lifecycle = 'idle';
        this.elapsedSimulationTimeSeconds = 0;
        this.finishedScore = undefined;
    }
}
