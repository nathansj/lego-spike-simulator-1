import { BIOGLOW_MATCH_RULES } from '$lib/fll/bioglow-match-rules';

export class BioglowMatchClock {
    private elapsedMatchTimeSeconds = 0;

    get durationSeconds(): number {
        return BIOGLOW_MATCH_RULES.duration.seconds;
    }

    get elapsedSeconds(): number {
        return this.elapsedMatchTimeSeconds;
    }

    get remainingSeconds(): number {
        return Math.max(0, this.durationSeconds - this.elapsedMatchTimeSeconds);
    }

    get expired(): boolean {
        return this.elapsedMatchTimeSeconds >= this.durationSeconds;
    }

    advanceFixedSteps(completedFixedSteps: number, fixedTimeStepSeconds: number): void {
        if (!Number.isSafeInteger(completedFixedSteps) || completedFixedSteps < 0) {
            throw new RangeError('Completed fixed steps must be a nonnegative safe integer');
        }
        if (!Number.isFinite(fixedTimeStepSeconds) || fixedTimeStepSeconds <= 0) {
            throw new RangeError('Fixed time step must be a finite, positive number of seconds');
        }

        const elapsedIncrementSeconds = completedFixedSteps * fixedTimeStepSeconds;
        if (!Number.isFinite(elapsedIncrementSeconds)) {
            throw new RangeError('Fixed-step elapsed time must be finite');
        }

        this.elapsedMatchTimeSeconds = Math.min(
            this.durationSeconds,
            this.elapsedMatchTimeSeconds + elapsedIncrementSeconds
        );
    }

    reset(): void {
        this.elapsedMatchTimeSeconds = 0;
    }
}
