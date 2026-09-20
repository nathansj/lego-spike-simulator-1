<script lang="ts">
    import { boundaryStore, sceneStore } from '$lib/spike/scene';
    import { createEventDispatcher } from 'svelte';
    import { Modal, Label, Range, Toggle } from 'flowbite-svelte';
    import {
        getStartDelay,
        getStepSleep,
        getTimeFactor,
        setStartDelay,
        setStepSleep,
        setTimeFactor
    } from '$lib/spike/vm';

    export let modalOpen = false;
    const dispatch = createEventDispatcher<{ change: void }>();
    let stepTime = getStepSleep() / 1000.0;
    let timeScale = getTimeFactor();
    let boundaryScale = $boundaryStore.scale;
    let startDelay = getStartDelay() / 1000.0;
    $: physicalEncoders = $sceneStore.physicsWorld?.encoderMode === 'physical';

    function updateSleep() {
        setStepSleep(stepTime * 1000);
        dispatch('change');
    }

    function updateStart() {
        setStartDelay(startDelay * 1000);
        dispatch('change');
    }

    function updateScale() {
        setTimeFactor(timeScale);
        dispatch('change');
    }

    function toggleBoundary() {
        boundaryStore.update((old) => {
            return {
                ...old,
                draw: !old.draw
            };
        });
        dispatch('change');
    }

    function updateBoundaryScale() {
        boundaryStore.update((old) => {
            return {
                ...old,
                scale: boundaryScale
            };
        });
        dispatch('change');
    }

    function toggleCollisions() {
        boundaryStore.update((old) => {
            return {
                ...old,
                collisions: !old.collisions
            };
        });
        dispatch('change');
    }

    function togglePhysicsDebug() {
        boundaryStore.update((old) => ({ ...old, debugPhysics: !old.debugPhysics }));
        dispatch('change');
    }

    function togglePhysicalEncoders() {
        sceneStore.update((scene) => ({
            ...scene,
            physicsWorld: {
                ...(scene.physicsWorld ?? {}),
                encoderMode: physicalEncoders ? 'command' : 'physical'
            }
        }));
        dispatch('change');
    }
</script>

<Modal
    backdropClass="fixed inset-0 z-[80] bg-gray-900 bg-opacity-50 dark:bg-opacity-80"
    dialogClass="fixed top-0 start-0 end-0 h-modal md:inset-0 md:h-full z-[90] w-full p-4 flex"
    title="Expert Setup: simulation and display settings"
    bind:open={modalOpen}
>
    <div class="flex flex-col gap-2 items-start">
        <p class="text-sm text-slate-700">
            Camera and boundary drawing are display-only. Simulation behavior changes are saved
            setup inputs and apply after Reset run.
        </p>
        <Label>Time between program steps: {stepTime} seconds</Label>
        <Range min="0" max="10" step="0.1" bind:value={stepTime} on:change={() => updateSleep()} />
        <div class="h-2" />
        <Label>Delay before starting: {startDelay} seconds</Label>
        <Range
            min="0"
            max="10"
            step="0.1"
            bind:value={startDelay}
            on:change={() => updateStart()}
        />
        <div class="h-2" />
        <Label>Time scaling (slower or faster): {timeScale}</Label>
        <Range
            min="0.1"
            max="5"
            step="0.1"
            bind:value={timeScale}
            on:change={() => updateScale()}
        />
        <div class="h-2" />
        <Label>Boundary scale (display-only): {$boundaryStore.scale}</Label>
        <Range
            min="1.0"
            max="4.0"
            step="1.0"
            bind:value={boundaryScale}
            on:change={() => updateBoundaryScale()}
        />
        <div class="h-2" />
        <Toggle size="small" on:change={() => toggleBoundary()} checked={$boundaryStore.draw}>
            Draw boundary (display-only)
        </Toggle>
        <Toggle
            size="small"
            on:change={() => toggleCollisions()}
            checked={$boundaryStore.collisions}
        >
            Show boundary collisions (display-only)
        </Toggle>
        <Toggle
            size="small"
            on:change={() => togglePhysicsDebug()}
            checked={$boundaryStore.debugPhysics}
        >
            Show physics colliders and joints (display-only)
        </Toggle>
        <Toggle size="small" on:change={() => togglePhysicalEncoders()} checked={physicalEncoders}>
            Physical drive encoders (wheel slip)
        </Toggle>
    </div>
</Modal>
