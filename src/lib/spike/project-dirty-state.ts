import { writable, type Readable } from 'svelte/store';
import {
    createProjectDirtyStateFromRevision,
    markProjectRevisionChanged,
    markProjectRevisionSaved,
    projectRevision,
    type ProjectDirtyState
} from '$lib/spike/project-contract';

export type DestructiveActionDecision = 'cancel' | 'discard';

export interface ProjectDirtyStore extends Readable<ProjectDirtyState> {
    markChanged(value: unknown): string;
    markLoaded(value: unknown): string;
    markSaved(value: unknown): string;
}

export function shouldConfirmDestructiveAction(state: Pick<ProjectDirtyState, 'dirty'>): boolean {
    return state.dirty;
}

export function canProceedWithDestructiveAction(
    state: Pick<ProjectDirtyState, 'dirty'>,
    decision: DestructiveActionDecision
): boolean {
    return !state.dirty || decision === 'discard';
}

export function createProjectDirtyStore(
    initialValue: unknown = { initial: true }
): ProjectDirtyStore {
    const initialRevision = projectRevision(initialValue);
    const state = writable<ProjectDirtyState>(
        createProjectDirtyStateFromRevision(initialRevision, initialRevision, 'after-load')
    );

    function revisionFor(value: unknown): string {
        return typeof value === 'string' ? value : projectRevision(value);
    }

    return {
        subscribe: state.subscribe,
        markChanged(value: unknown): string {
            const revision = revisionFor(value);
            state.update((current) => markProjectRevisionChanged(revision, current.savedRevision));
            return revision;
        },
        markLoaded(value: unknown): string {
            const revision = revisionFor(value);
            state.set(createProjectDirtyStateFromRevision(revision, revision, 'after-load'));
            return revision;
        },
        markSaved(value: unknown): string {
            const revision = revisionFor(value);
            state.set(markProjectRevisionSaved(revision));
            return revision;
        }
    };
}

export const projectDirtyStore = createProjectDirtyStore();
