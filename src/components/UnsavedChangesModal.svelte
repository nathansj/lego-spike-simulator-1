<script lang="ts">
    import { createEventDispatcher, tick } from 'svelte';

    export let open = false;
    export let actionLabel = 'continue';

    const dispatch = createEventDispatcher<{ cancel: void; discard: void }>();
    let cancelButton: HTMLButtonElement;

    $: if (open) {
        tick().then(() => cancelButton?.focus());
    }
</script>

{#if open}
    <div class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4">
        <div
            class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            aria-describedby="unsaved-changes-description"
        >
            <h2 id="unsaved-changes-title" class="text-lg font-semibold text-slate-900">
                Unsaved changes
            </h2>
            <p id="unsaved-changes-description" class="mt-2 text-sm text-slate-700">
                This project has unsaved setup changes. Save them first, keep working, or discard
                them and {actionLabel}. Your current setup stays unchanged when you keep working.
            </p>
            <div class="mt-5 flex justify-end gap-2">
                <button
                    bind:this={cancelButton}
                    type="button"
                    class="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800"
                    on:click={() => dispatch('cancel')}
                >
                    Keep working
                </button>
                <button
                    type="button"
                    class="rounded bg-red-700 px-3 py-2 text-sm font-medium text-white"
                    on:click={() => dispatch('discard')}
                >
                    Discard changes
                </button>
            </div>
        </div>
    </div>
{/if}
