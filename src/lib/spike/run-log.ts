import { writable } from 'svelte/store';

export type RunLogLevel = 'info' | 'warn' | 'error';

export interface RunLogEntry {
    id: number;
    timestamp: string;
    level: RunLogLevel;
    message: string;
}

const maximumEntries = 500;
let nextEntryId = 1;

export const runLogStore = writable<RunLogEntry[]>([]);

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
