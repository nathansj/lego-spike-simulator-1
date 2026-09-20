import { writable } from 'svelte/store';

export type RunLogLevel = 'info' | 'warn' | 'error';

export interface RunLogEntry {
    id: number;
    timestamp: string;
    level: RunLogLevel;
    message: string;
}

export interface RunLogGuidance {
    observation: string;
    nextAction: string;
}

const maximumEntries = 500;
let nextEntryId = 1;

export const runLogStore = writable<RunLogEntry[]>([]);

export function formatRunLogEntries(entries: readonly RunLogEntry[]): string {
    return entries
        .map((entry) => `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`)
        .join('\n');
}

export function getRunLogGuidance(entry: Pick<RunLogEntry, 'message'>): RunLogGuidance {
    const snag = entry.message.match(/cause=physics-snag-contact=([^\s]+)/);
    if (snag) {
        const bodies = snag[1].replaceAll(',', ', ');
        return {
            observation: `A physics step reported contact with ${bodies}.`,
            nextAction:
                'Pause the run and inspect the named bodies with collider overlays; verify their transforms before changing the program.'
        };
    }

    const stationary = entry.message.match(/cause=stationary-in-contact-with:([^\s]+)/);
    if (stationary) {
        const bodies = stationary[1].replaceAll(',', ', ');
        return {
            observation: `The robot was stationary while contact with ${bodies} was reported.`,
            nextAction:
                'Pause the run and compare the robot and named body colliders at the reported contact; this is evidence to inspect, not proof of causation.'
        };
    }

    if (entry.message.includes('cause=driven-motors-off')) {
        return {
            observation: 'The drive motors were reported off during this step.',
            nextAction: 'Inspect the program motor blocks and the configured drive-wheel ports.'
        };
    }

    if (entry.message.includes('cause=simulation-missing')) {
        return {
            observation: 'The simulation was reported unavailable.',
            nextAction:
                'Stop and start the run again, then verify that the scene and robot physics bodies are loaded.'
        };
    }

    if (entry.message.includes('cause=robot-body-missing')) {
        return {
            observation: 'The robot physics body was reported unavailable.',
            nextAction: 'Reload the robot and inspect its physics setup before running again.'
        };
    }

    return {
        observation:
            entry.message.length > 160 ? `${entry.message.slice(0, 157)}...` : entry.message,
        nextAction:
            'Inspect the raw evidence for the surrounding fixed-step telemetry; no specific cause is inferred from this entry.'
    };
}

export function clearRunLog(): void {
    runLogStore.set([]);
}

export function appendRunLog(level: RunLogLevel, message: string): void {
    const entry: RunLogEntry = {
        id: nextEntryId++,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message
    };
    runLogStore.update((entries) => [...entries, entry].slice(-maximumEntries));
}
