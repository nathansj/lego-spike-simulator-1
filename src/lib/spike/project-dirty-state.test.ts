import { describe, expect, it } from 'vitest';
import {
    canProceedWithDestructiveAction,
    createProjectDirtyStore,
    shouldConfirmDestructiveAction
} from './project-dirty-state';
import type { ProjectDirtyState } from './project-contract';

describe('project dirty-state controller', () => {
    it('transitions clean, changed, saved, and restored projects', () => {
        const store = createProjectDirtyStore({ scene: 'initial' });
        let state: ProjectDirtyState = {
            savedRevision: undefined,
            currentRevision: '',
            dirty: false,
            reloadBoundary: 'after-load'
        };
        const unsubscribe = store.subscribe((value) => (state = value));

        expect(state.dirty).toBe(false);
        store.markChanged({ scene: 'edited' });
        expect(state.dirty).toBe(true);
        expect(state.reloadBoundary).toBe('before-run');

        store.markSaved({ scene: 'edited' });
        expect(state.dirty).toBe(false);
        expect(state.reloadBoundary).toBe('after-save');

        store.markLoaded({ scene: 'restored' });
        expect(state.dirty).toBe(false);
        expect(state.reloadBoundary).toBe('after-load');
        unsubscribe();
    });

    it('only asks for confirmation when the project is dirty', () => {
        expect(shouldConfirmDestructiveAction({ dirty: false })).toBe(false);
        expect(shouldConfirmDestructiveAction({ dirty: true })).toBe(true);
        expect(canProceedWithDestructiveAction({ dirty: false }, 'cancel')).toBe(true);
        expect(canProceedWithDestructiveAction({ dirty: true }, 'cancel')).toBe(false);
        expect(canProceedWithDestructiveAction({ dirty: true }, 'discard')).toBe(true);
    });
});
