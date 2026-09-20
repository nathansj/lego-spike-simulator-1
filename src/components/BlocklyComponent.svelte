<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import AudioDialog from '$components/AudioDialog.svelte';
    import VariableDialog from '$components/VariableDialog.svelte';
    import ProcedureDialog from '$components/ProcedureDialog.svelte';
    import PrintDialog from '$components/PrintDialog.svelte';
    import SpikeSimulatorWindow from '$components/SpikeSimulatorWindow.svelte';
    import * as Blockly from 'blockly/core';
    // Import the list of blocks so it gets loaded into blockly
    import 'blockly/blocks';
    import * as En from 'blockly/msg/en';
    import '$lib/blockly/render';
    import '$lib/blockly/theme';
    import '$lib/blockly/field_variable_getter';
    import '$lib/blockly/field-bitmap';
    import '$lib/blockly/field-grid-dropdown';
    import '$lib/blockly/field-ultra-sound';
    import '$lib/blockly/field-sound';
    import '$lib/blockly/field_metadata';
    import { procedureBlocks } from '$lib/blockly/procedure_blocks';
    import * as procedureFlyout from '$lib/blockly/procedure_flyout';
    import * as variableFlyout from '$lib/blockly/variable_flyout';
    import * as fieldAngle from '$lib/blockly/field_angle';
    import {
        registerInputShadowExtension,
        applyInputShadowExtension
    } from '$lib/blockly/shadow_input';
    import { registerProcedureCallExtension } from '$lib/blockly/procedure_call_extension';
    import * as colourPkg from '@blockly/field-colour';
    import { ZoomToFitControl } from '@blockly/zoom-to-fit';
    import { blocks } from '$lib/blockly/blocks';
    import { toolbox } from '$lib/blockly/toolbox';
    import { type BlocklyState } from '$lib/blockly/state';
    import { Button } from 'flowbite-svelte';
    import {
        ChevronDownOutline,
        ChevronRightOutline,
        CloseOutline,
        CodeOutline,
        EyeOutline,
        EyeSlashOutline,
        LayersOutline,
        PlayOutline,
        StopOutline,
        ToolsOutline
    } from 'flowbite-svelte-icons';
    import { loadScratchSb3 } from '$lib/scratch/sb3';
    import { createManifest } from '$lib/scratch/manifest';
    import { convertToBlockly, convertToScratch, mergeBlockly } from '$lib/scratch/blockly';
    import { cat, clearSelectedAudio, selectAudio, registerAudioDialog } from '$lib/blockly/audio';
    import JSZip from 'jszip';
    import FileSaver from 'file-saver';
    import UnsavedChangesModal from '$components/UnsavedChangesModal.svelte';
    import {
        canProceedWithDestructiveAction,
        projectDirtyStore,
        shouldConfirmDestructiveAction
    } from '$lib/spike/project-dirty-state';
    import { Hub } from '$lib/spike/vm';
    import type { PracticeResult } from '$lib/spike/practice-result';
    import HubWidget from '$components/HubWidget.svelte';
    import RunLogConsole from '$components/RunLogConsole.svelte';

    let workspace: Blockly.WorkspaceSvg | undefined;
    let zoomToFit: ZoomToFitControl | undefined;
    let hub = new Hub();
    let hubImage = '0000000000000000000000000';
    let hubCentreButtonColour = '#ffffff';
    let practiceResult: PracticeResult | undefined = undefined;
    let simulationPaused = false;
    let programExecutionIdle = false;
    let droneSurveyElapsedSeconds = 0;
    let runPauseDisabled = false;
    let blocklyCodeOpen = true;
    let hubSectionOpen = true;
    let diagnosticsSectionOpen = true;
    let numberOfLoads = 0;
    let variableType = '';
    let audioDialogOpen = false;
    let variableDialogOpen = false;
    let variableCreateCallback: variableFlyout.VariableCreateCallback | undefined = undefined;
    let procedureDialogOpen = false;
    let procedureCreateCallback: procedureFlyout.ProcedureCreateCallback | undefined = undefined;
    let simulatorOpen = true;
    let blocklyOpen = true;
    let split = 2;
    let observer = new ResizeObserver(onBlocklyResize);
    let print = false;
    let printDialogOpen = false;
    let printColour = false;
    let workspaceChangeListener: ((event: Blockly.Events.Abstract) => void) | undefined;
    let unsavedChangesOpen = false;
    let commandsOpen = false;
    let commandMenuOpen = false;
    let commandsButton: HTMLButtonElement | undefined;
    let activePane: 'program' | 'simulator' = 'program';
    let runSimulation = false;
    let practiceReady = false;
    let simulatorWindow: SpikeSimulatorWindow | undefined;
    let commandHoverTimer: ReturnType<typeof setTimeout> | undefined;

    const commandCategories = toolbox.contents.filter((item) => item.kind === 'category');

    function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function createAudioDialog() {
        audioDialogOpen = true;
    }

    function createProcedureDialog(callback: procedureFlyout.ProcedureCreateCallback) {
        procedureCreateCallback = callback;
        procedureDialogOpen = true;
    }

    function createVariableDialog(type: string, callback: variableFlyout.VariableCreateCallback) {
        variableCreateCallback = callback;
        variableType = type;
        variableDialogOpen = true;
    }

    onMount(() => {
        fieldAngle.registerFieldAngle();
        colourPkg.registerFieldColour();
        Blockly.common.defineBlocksWithJsonArray(procedureBlocks);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Blockly.setLocale(En as any as Record<string, string>);
        registerInputShadowExtension(Blockly);
        registerProcedureCallExtension(Blockly);
        Blockly.defineBlocksWithJsonArray(blocks);
        // Also apply the shadow extension to any blocks that
        // don't declare they use it.
        applyInputShadowExtension(Blockly);
        // Only include procedure defintion, like spike does
        const element = document.getElementById('blocklyDiv');
        if (element == null) {
            return;
        }
        Blockly.ContextMenuItems.registerCommentOptions();
        workspace = Blockly.inject(element, {
            renderer: 'spike_renderer',
            grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
            theme: 'spike',
            media: 'blockly/media/',
            comments: true,
            zoom: {
                controls: true,
                wheel: false,
                startScale: 0.675,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2,
                pinch: true
            },
            toolbox: toolbox
        });
        workspace.getToolbox()?.setVisible(false);
        variableFlyout.registerVariableFlyout(workspace, createVariableDialog);
        procedureFlyout.registerProcedureFlyout(workspace, createProcedureDialog);
        registerAudioDialog(workspace, createAudioDialog);
        selectAudio('Cat Meow 1');
        const zoomToFit = new ZoomToFitControl(workspace);
        zoomToFit.init();
        observer.observe(element);
        workspace.createVariable('message1', 'broadcast');
        workspaceChangeListener = (event: Blockly.Events.Abstract) => {
            if (event.isUiEvent) return;
            if (!workspace) return;
            projectDirtyStore.markChanged({
                blockly: Blockly.serialization.workspaces.save(workspace)
            });
        };
        workspace.addChangeListener(workspaceChangeListener);
    });

    onDestroy(() => {
        if (zoomToFit) {
            zoomToFit.dispose();
        }
        observer.disconnect();
        if (workspace && workspaceChangeListener) {
            workspace.removeChangeListener(workspaceChangeListener);
        }
    });

    function onBlocklyResize() {
        if (!workspace) {
            return;
        }
        Blockly.svgResize(workspace);
    }

    async function loadLlsp3(f: File) {
        const zip = new JSZip();
        const zipFile = await zip.loadAsync(f);
        const file = zipFile.file('scratch.sb3');
        if (!file) {
            console.log('Missing scratch.sb3');
            return;
        }
        const content = await file.async('arraybuffer');
        const project = await loadScratchSb3(content);
        if (project) {
            const state = convertToBlockly(project);
            if (state) {
                clearSelectedAudio();
                selectAudio('Cat Meow 1');
                for (const target of project.targets) {
                    for (const sound of target.sounds) {
                        selectAudio(sound.name);
                    }
                }
                selectAudio('Cat Meow 1');
                if (workspace) {
                    // Clear the workspace to allow procedures to be destroyed
                    workspace.clear();
                    // Wait for workspace events to fire and complete
                    await sleep(100);
                    Blockly.serialization.workspaces.load(state, workspace);
                    const existing = Blockly.Variables.nameUsedWithAnyType('message1', workspace);
                    if (!existing) {
                        // No conflict
                        workspace.createVariable('message1', 'broadcast');
                    }
                    try {
                        const manifestFile = zipFile.file('manifest.json');
                        if (manifestFile) {
                            const manifest = JSON.parse(await manifestFile.async('string'));
                            if (manifest.zoomLevel) {
                                workspace.setScale(manifest.zoomLevel);
                            }
                            if (manifest.workspaceX && manifest.workspaceY) {
                                workspace.scroll(manifest.workspaceX, manifest.workspaceY);
                            }
                        }
                    } catch {
                        // ignore failures
                    }
                }
            } else {
                // TODO: Display an error
                console.log('Failed to convert project');
            }
        } else {
            // TODO: Display an error
            console.log('Failed to load project');
        }
    }

    function loadState() {
        const element = document.getElementById('load_project');
        if (element) {
            const fileElement = element as HTMLInputElement;
            if (fileElement.files) {
                if (fileElement.files.length > 0) {
                    const first = fileElement.files[0];
                    numberOfLoads++;
                    loadLlsp3(first);
                }
            }
        }
    }

    async function mergeLlsp3(f: File) {
        const zip = new JSZip();
        const zipFile = await zip.loadAsync(f);
        const file = zipFile.file('scratch.sb3');
        if (!file) {
            console.log('Missing scratch.sb3');
            return;
        }
        const content = await file.async('arraybuffer');
        const project = await loadScratchSb3(content);
        if (project) {
            const state = convertToBlockly(project);
            if (state) {
                for (const target of project.targets) {
                    for (const sound of target.sounds) {
                        selectAudio(sound.name);
                    }
                }
                if (workspace) {
                    const oldState = Blockly.serialization.workspaces.save(workspace);
                    const newState = mergeBlockly(oldState, state);
                    Blockly.serialization.workspaces.load(newState, workspace);
                }
            } else {
                // TODO: Display an error
                console.log('Failed to convert project');
            }
        } else {
            // TODO: Display an error
            console.log('Failed to load project');
        }
    }

    function mergeState() {
        const element = document.getElementById('load_merge');
        if (element) {
            const fileElement = element as HTMLInputElement;
            if (fileElement.files) {
                if (fileElement.files.length > 0) {
                    const first = fileElement.files[0];
                    numberOfLoads++;
                    mergeLlsp3(first);
                }
            }
        }
    }

    function askForFile() {
        if (shouldConfirmDestructiveAction($projectDirtyStore)) {
            unsavedChangesOpen = true;
            return;
        }
        openProgramFilePicker();
    }

    function openProgramFilePicker(): void {
        const element = document.getElementById('load_project');
        if (element) {
            element.click();
        }
    }

    function cancelProgramLoad(): void {
        unsavedChangesOpen = false;
    }

    function confirmProgramLoad(): void {
        if (!canProceedWithDestructiveAction($projectDirtyStore, 'discard')) return;
        unsavedChangesOpen = false;
        openProgramFilePicker();
    }

    function askForMerge() {
        const element = document.getElementById('load_merge');
        if (element) {
            element.click();
        }
    }

    async function saveState() {
        if (workspace) {
            let robotSvg = `<svg xmlns="http://www.w3.org/2000/svg" 
                                 id="mdi-robot-outline"
                                 viewBox="0 0 24 24">
                            <path d="M17.5 15.5C17.5 16.61 16.61 17.5 
                                    15.5 17.5S13.5 16.61 13.5 15.5 14.4 
                                    13.5 15.5 13.5 17.5 14.4 17.5 
                                    15.5M8.5 13.5C7.4 13.5 6.5 14.4 6.5 
                                    15.5S7.4 17.5 8.5 17.5 10.5 16.61 
                                    10.5 15.5 9.61 13.5 8.5 13.5M23 
                                    15V18C23 18.55 22.55 19 22 19H21V20C21 
                                    21.11 20.11 22 19 22H5C3.9 22 3 21.11 
                                    3 20V19H2C1.45 19 1 18.55 1 18V15C1 14.45 
                                    1.45 14 2 14H3C3 10.13 6.13 7 10 
                                    7H11V5.73C10.4 5.39 10 4.74 10 4C10 2.9 
                                    10.9 2 12 2S14 2.9 14 4C14 4.74 13.6 
                                    5.39 13 5.73V7H14C17.87 7 21 10.13 21 
                                    14H22C22.55 14 23 14.45 23 15M21 
                                    16H19V14C19 11.24 16.76 9 14 9H10C7.24
                                    9 5 11.24 5 14V16H3V17H5V20H19V17H21V16Z"/>
                             </svg>`;

            const state = Blockly.serialization.workspaces.save(workspace);
            const sb3 = convertToScratch(state as BlocklyState);
            const zip = new JSZip();
            zip.file('project.json', JSON.stringify(sb3));
            zip.file('deadc057000000000000000000000000.svg', '');
            zip.file('1b8b032b06360a6cf7c31d86bddd144b.wav', cat, { base64: true });
            const sb3content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            const llsp3Zip = new JSZip();
            llsp3Zip.file(
                'manifest.json',
                JSON.stringify(createManifest(workspace, sb3.extensions))
            );
            llsp3Zip.file('scratch.sb3', sb3content);
            llsp3Zip.file('icon.svg', robotSvg);
            const content = await llsp3Zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            FileSaver.saveAs(content, 'project.llsp3');
            // TODO: Save audio as well, we don't add new audio
        }
    }

    function toggleRobot() {
        simulatorOpen = !simulatorOpen;
    }

    function togglePrintDialog() {
        printDialogOpen = !printDialogOpen;
    }

    function printCallback(colour: boolean) {
        printColour = colour;
        print = !print;
    }

    function toggleSize() {
        split = 2 - split + 1;
    }

    function resizeWorkspace(open: boolean) {
        if (!open && !blocklyOpen) {
            blocklyOpen = true;
        }
        setTimeout(() => {
            if (workspace) {
                Blockly.svgResize(workspace);
            }
        }, 50);
    }

    function closeWindow() {
        blocklyOpen = false;
    }

    function openCommands(pinned = true): void {
        if (commandHoverTimer) clearTimeout(commandHoverTimer);
        commandsOpen = true;
        if (pinned) commandMenuOpen = true;
    }

    function scheduleCommandPreview(): void {
        if (commandMenuOpen || commandsOpen) return;
        commandHoverTimer = setTimeout(() => openCommands(false), 200);
    }

    function cancelCommandPreview(): void {
        if (commandHoverTimer) clearTimeout(commandHoverTimer);
    }

    function scheduleCommandClose(): void {
        cancelCommandPreview();
        if (commandMenuOpen) return;
        commandHoverTimer = setTimeout(() => {
            if (!commandMenuOpen) {
                commandsOpen = false;
                workspace?.getToolbox()?.clearSelection();
            }
        }, 200);
    }

    function closeCommands(): void {
        cancelCommandPreview();
        commandsOpen = false;
        commandMenuOpen = false;
        workspace?.getToolbox()?.clearSelection();
        commandsButton?.focus();
    }

    function selectCommandCategory(position: number): void {
        commandsOpen = true;
        commandMenuOpen = true;
        workspace?.getToolbox()?.selectItemByPosition(position);
    }

    function handleCommandKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeCommands();
        }
    }

    function runOrCorrectFromProgram(): void {
        simulatorWindow?.runOrCorrect();
    }

    function closePrint() {
        print = false;
    }

    async function setPrintMode(print: boolean) {
        if (workspace) {
            if (print) {
                const metrics = workspace.getMetricsManager().getContentMetrics(false);
                const blocks = document.getElementsByClassName('blocklyBlockCanvas');
                if (blocks.length > 0) {
                    document.getElementById('blockly-ui')!.classList.add('hidden');
                    const printSvg = document.getElementById('printSvg')!;
                    const clone = blocks[0].cloneNode(true) as Element;
                    printSvg.appendChild(clone);
                    printSvg.style.width = `${Math.ceil(metrics.width) + 100}px`;
                    printSvg.style.height = `${Math.ceil(metrics.height) + 100}px`;
                    clone.setAttribute(
                        'transform',
                        `translate(${-metrics.left} ${-metrics.top}) scale(${workspace.scale} ${workspace.scale})`
                    );
                }
                setTimeout(() => {
                    window.print();
                    const element = document.getElementById('print_close_button');
                    if (element) {
                        element.click();
                    }
                }, 500);
            } else {
                const printSvg = document.getElementById('printSvg')!;
                printSvg.innerHTML = '';
                document.getElementById('blockly-ui')!.classList.remove('hidden');
                printSvg.style.width = '0px';
                printSvg.style.height = '0px';
            }
        }
    }

    $: resizeWorkspace(simulatorOpen);
    $: if (workspace && blocklyCodeOpen) {
        setTimeout(() => {
            if (workspace) {
                Blockly.svgResize(workspace);
            }
        }, 50);
    }
    $: setPrintMode(print);
    $: simulatorToggleLabel = simulatorOpen ? 'Hide simulator' : 'Show simulator';
    $: stripRunLabel = runSimulation ? 'Stop run' : practiceReady ? 'Run program' : 'Fix setup';
</script>

{#key numberOfLoads}
    <input type="file" id="load_project" class="hidden" accept=".llsp3" on:change={loadState} />
    <input type="file" id="load_merge" class="hidden" accept=".llsp3" on:change={mergeState} />
{/key}
<AudioDialog bind:modalOpen={audioDialogOpen} />
<VariableDialog
    bind:modalOpen={variableDialogOpen}
    bind:callback={variableCreateCallback}
    bind:type={variableType}
/>
<ProcedureDialog bind:modalOpen={procedureDialogOpen} bind:callback={procedureCreateCallback} />
<PrintDialog bind:modalOpen={printDialogOpen} callback={printCallback} />
<UnsavedChangesModal
    open={unsavedChangesOpen}
    actionLabel="load this program"
    on:cancel={cancelProgramLoad}
    on:discard={confirmProgramLoad}
/>

<div class="relative flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
    <div
        class="flex shrink-0 border-b border-slate-200 bg-white lg:hidden"
        role="tablist"
        aria-label="Practice panes"
    >
        <button
            type="button"
            role="tab"
            aria-selected={activePane === 'program'}
            class="flex-1 px-3 py-2 text-sm font-semibold {activePane === 'program'
                ? 'border-b-2 border-blue-700 text-blue-800'
                : 'text-slate-600'}"
            on:click={() => (activePane = 'program')}
        >
            Program
        </button>
        <button
            type="button"
            role="tab"
            aria-selected={activePane === 'simulator'}
            class="flex-1 px-3 py-2 text-sm font-semibold {activePane === 'simulator'
                ? 'border-b-2 border-blue-700 text-blue-800'
                : 'text-slate-600'}"
            on:click={() => (activePane = 'simulator')}
        >
            Simulator
        </button>
    </div>
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div
            class="relative min-h-0 min-w-0 w-full flex-col overflow-hidden {blocklyOpen
                ? simulatorOpen
                    ? activePane === 'program'
                        ? 'flex h-full lg:flex-1'
                        : 'hidden lg:flex lg:flex-1'
                    : 'flex h-full'
                : 'hidden'}"
        >
            <div
                class="z-10 flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2"
            >
                <span class="text-sm font-semibold text-slate-800">Blockly code</span>
                <button
                    type="button"
                    class="icon-btn p-1 text-slate-700 hover:bg-slate-100"
                    aria-expanded={blocklyCodeOpen}
                    aria-controls="blockly-code-section"
                    aria-label={blocklyCodeOpen ? 'Collapse Blockly code' : 'Expand Blockly code'}
                    title={blocklyCodeOpen ? 'Collapse Blockly code' : 'Expand Blockly code'}
                    on:click={() => (blocklyCodeOpen = !blocklyCodeOpen)}
                >
                    {#if blocklyCodeOpen}
                        <ChevronDownOutline size="sm" aria-hidden="true" />
                    {:else}
                        <ChevronRightOutline size="sm" aria-hidden="true" />
                    {/if}
                </button>
                <div class="relative">
                    <button
                        type="button"
                        class="icon-btn border border-slate-300 px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        aria-haspopup="menu"
                        aria-expanded={commandMenuOpen}
                        aria-label="Blockly view"
                        title="Blockly view"
                        on:click={() => (commandMenuOpen = !commandMenuOpen)}
                        on:keydown={(event) => event.key === 'Escape' && (commandMenuOpen = false)}
                    >
                        <CodeOutline size="sm" aria-hidden="true" />
                        <ChevronDownOutline size="xs" aria-hidden="true" />
                    </button>
                    {#if commandMenuOpen}
                        <div
                            class="absolute left-0 top-full z-30 mt-1 w-44 rounded border border-slate-200 bg-white p-1 shadow-lg"
                            role="menu"
                        >
                            <button
                                type="button"
                                class="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                                role="menuitem"
                                on:click={() => openCommands(true)}>Show commands</button
                            >
                            <button
                                type="button"
                                class="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                                role="menuitem"
                                on:click={askForFile}>Open program</button
                            >
                            <button
                                type="button"
                                class="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                                role="menuitem"
                                on:click={askForMerge}>Import program</button
                            >
                            <button
                                type="button"
                                class="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                                role="menuitem"
                                on:click={saveState}>Save program</button
                            >
                            <button
                                type="button"
                                class="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                                role="menuitem"
                                on:click={togglePrintDialog}>Print program</button
                            >
                        </div>
                    {/if}
                </div>
                <Button id="print_close_button" color="light" class="hidden" on:click={closePrint}>
                    Close print
                </Button>
                <div class="flex-1" />
                <button
                    type="button"
                    class="icon-btn p-1 text-sm font-medium text-blue-800 hover:bg-slate-100"
                    aria-label={simulatorToggleLabel}
                    title={simulatorToggleLabel}
                    on:click={toggleRobot}
                >
                    <section
                        class="shrink-0 border-t border-slate-200 bg-white"
                        aria-labelledby="hub-runtime-title"
                    >
                        <button
                            type="button"
                            class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                            aria-expanded={hubSectionOpen}
                            aria-controls="hub-runtime-section"
                        >
                            <span id="hub-runtime-title">Hub runtime</span>
                            {#if hubSectionOpen}
                                <ChevronDownOutline size="sm" aria-hidden="true" />
                            {:else}
                                <ChevronRightOutline size="sm" aria-hidden="true" />
                            {/if}
                        </button>
                        {#if hubSectionOpen}
                            <div id="hub-runtime-section" class="px-3 pb-3">
                                <HubWidget
                                    image={hubImage}
                                    centreButtonColour={hubCentreButtonColour}
                                    on:leftPress={() => (hub.leftPressed = true)}
                                    on:rightPress={() => (hub.rightPressed = true)}
                                    on:leftRelease={() => (hub.leftPressed = false)}
                                    on:rightRelease={() => (hub.rightPressed = false)}
                                />
                            </div>
                        {/if}
                    </section>
                    <section
                        class="shrink-0 border-t border-slate-200 bg-white"
                        aria-labelledby="diagnostics-section-title"
                    >
                        <button
                            type="button"
                            class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                            aria-expanded={diagnosticsSectionOpen}
                            aria-controls="diagnostics-section-body"
                        >
                            <span id="diagnostics-section-title">Diagnostics</span>
                            {#if diagnosticsSectionOpen}
                                <ChevronDownOutline size="sm" aria-hidden="true" />
                            {:else}
                                <ChevronRightOutline size="sm" aria-hidden="true" />
                            {/if}
                        </button>
                        {#if diagnosticsSectionOpen}
                            <div
                                id="diagnostics-section-body"
                                class="max-h-72 overflow-y-auto px-3 pb-3"
                            >
                                {#if runSimulation || practiceResult}
                                    <section
                                        class="mb-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm"
                                        aria-labelledby="practice-run-status"
                                    >
                                        <div
                                            class="flex flex-wrap items-center justify-between gap-2"
                                        >
                                            <h2
                                                id="practice-run-status"
                                                class="font-semibold text-slate-900"
                                            >
                                                {#if practiceResult}
                                                    Run result
                                                {:else if simulationPaused}
                                                    Paused
                                                {:else if programExecutionIdle}
                                                    Program activity is idle
                                                {:else}
                                                    Running · {droneSurveyElapsedSeconds.toFixed(1)}
                                                    s
                                                {/if}
                                            </h2>
                                            <div class="flex flex-wrap gap-2">
                                                {#if runSimulation}
                                                    <button
                                                        type="button"
                                                        class="rounded border border-blue-300 bg-white px-2 py-1 font-medium text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                        on:click={() =>
                                                            simulatorWindow?.pauseOrResumeRun()}
                                                        disabled={runPauseDisabled}
                                                    >
                                                        {simulationPaused ? 'Resume' : 'Pause'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        class="rounded border border-red-300 bg-white px-2 py-1 font-medium text-red-800"
                                                        on:click={() =>
                                                            simulatorWindow?.stopCurrentRun()}
                                                    >
                                                        Stop
                                                    </button>
                                                {/if}
                                                <button
                                                    type="button"
                                                    class="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-800"
                                                    on:click={() =>
                                                        simulatorWindow?.resetCurrentRun()}
                                                >
                                                    Reset run
                                                </button>
                                            </div>
                                        </div>
                                        {#if practiceResult}
                                            <p
                                                class="mt-2 text-slate-800"
                                                role="status"
                                                aria-live="polite"
                                            >
                                                {practiceResult.message}
                                            </p>
                                            <p class="mt-1 text-xs text-slate-600">
                                                Check diagnostics for the detailed error, then reset
                                                and try again.
                                            </p>
                                            <div class="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    class="rounded border border-blue-300 bg-white px-2 py-1 font-medium text-blue-800"
                                                    on:click={() =>
                                                        simulatorWindow?.resetCurrentRun()}
                                                >
                                                    Run again
                                                </button>
                                                <button
                                                    type="button"
                                                    class="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-800"
                                                    on:click={() =>
                                                        simulatorWindow?.openDiagnosticsMode()}
                                                >
                                                    Open diagnostics
                                                </button>
                                            </div>
                                        {:else if programExecutionIdle}
                                            <p class="mt-2 text-xs text-slate-700" role="status">
                                                Program activity is idle. The simulator cannot
                                                confirm whether the program finished; stop or reset
                                                the run when you are ready.
                                            </p>
                                        {:else}
                                            <p class="mt-2 text-xs text-slate-700">
                                                Pause holds the program. Stop keeps the scene
                                                available for inspection. Reset returns the robot to
                                                the saved setup.
                                            </p>
                                        {/if}
                                    </section>
                                {/if}
                                <RunLogConsole />
                            </div>
                        {/if}
                    </section>
                    {#if simulatorOpen}
                        <EyeSlashOutline size="sm" aria-hidden="true" />
                    {:else}
                        <EyeOutline size="sm" aria-hidden="true" />
                    {/if}
                </button>
            </div>
            <div
                id="blockly-code-section"
                class="relative min-h-0 min-w-0 flex-1 w-full overflow-hidden"
                class:hidden={!blocklyCodeOpen}
                on:pointerdown={() => commandsOpen && closeCommands()}
            >
                <div id="blocklyDiv" />
                <div class="absolute left-2 right-2 top-2 z-20 lg:right-auto">
                    <button
                        bind:this={commandsButton}
                        type="button"
                        class="icon-btn rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        aria-expanded={commandsOpen}
                        aria-controls="command-category-overlay"
                        aria-label="Commands"
                        title="Commands"
                        on:click={() => openCommands(true)}
                        on:mouseenter={scheduleCommandPreview}
                        on:mouseleave={scheduleCommandClose}
                        on:keydown={handleCommandKeydown}
                    >
                        <LayersOutline size="sm" aria-hidden="true" />
                        {#if commandsOpen}
                            <ChevronDownOutline size="xs" aria-hidden="true" />
                        {:else}
                            <ChevronRightOutline size="xs" aria-hidden="true" />
                        {/if}
                    </button>
                    {#if commandsOpen}
                        <div
                            id="command-category-overlay"
                            class="mt-1 max-h-[calc(100vh-14rem)] w-full overflow-y-auto rounded border border-slate-200 bg-white p-2 shadow-lg lg:w-56"
                            role="menu"
                            tabindex="-1"
                            aria-label="Choose a block category"
                            on:mouseenter={cancelCommandPreview}
                            on:mouseleave={scheduleCommandClose}
                            on:keydown={handleCommandKeydown}
                        >
                            <div class="mb-2 flex items-center justify-between gap-2">
                                <span
                                    class="text-xs font-semibold uppercase tracking-wide text-slate-500"
                                    >Choose a category</span
                                >
                                <button
                                    type="button"
                                    class="icon-btn p-1 text-blue-800 hover:bg-slate-100"
                                    aria-label="Close commands"
                                    title="Close commands"
                                    on:click={closeCommands}
                                >
                                    <CloseOutline size="sm" aria-hidden="true" />
                                </button>
                            </div>
                            <div class="grid gap-1">
                                {#each commandCategories as category, index}
                                    <button
                                        type="button"
                                        role="menuitem"
                                        class="rounded border-l-4 bg-slate-50 px-2 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-100"
                                        style:--category-colour={category.colour ?? '#64748b'}
                                        on:click={() => selectCommandCategory(index)}
                                    >
                                        {category.name}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
            {#if simulatorOpen}
                <div
                    class="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 lg:hidden"
                >
                    <span class="text-sm text-slate-600"
                        >{practiceReady ? 'Ready to run.' : 'Finish setup before running.'}</span
                    >
                    <Button
                        color={runSimulation ? 'red' : practiceReady ? 'green' : 'light'}
                        size="sm"
                        aria-label={stripRunLabel}
                        title={stripRunLabel}
                        on:click={runOrCorrectFromProgram}
                    >
                        {#if runSimulation}
                            <StopOutline size="md" aria-hidden="true" />
                        {:else if practiceReady}
                            <PlayOutline size="md" aria-hidden="true" />
                        {:else}
                            <ToolsOutline size="md" aria-hidden="true" />
                        {/if}
                    </Button>
                </div>
            {/if}
        </div>
        <SpikeSimulatorWindow
            bind:this={simulatorWindow}
            bind:hub
            bind:hubImage
            bind:hubCentreButtonColour
            bind:practiceResult
            bind:simulationPaused
            bind:programExecutionIdle
            bind:droneSurveyElapsedSeconds
            bind:runPauseDisabled
            bind:modalOpen={simulatorOpen}
            bind:blocklyOpen
            bind:activePane
            bind:runSimulation
            bind:practiceReady
            {workspace}
            {split}
        />
    </div>
</div>

{#if !print || printColour}
    <style scoped>
        #blocklyDiv {
            height: 100%;
            width: 100%;
        }
        #blocklyDiv :global(.blocklyToolboxDiv) {
            display: none !important;
        }
        #command-category-overlay button {
            border-left-color: var(--category-colour);
        }
        .print-renderer.spike-theme .blocklyText {
            fill: #000;
        }
        .print-renderer.spike-theme .blocklyFieldRect {
            fill: white !important;
            stroke: white !important;
        }
    </style>
{:else}
    <style>
        #blocklyDiv {
            height: 100%;
            width: 100%;
        }
        .blocklyPath {
            stroke-width: 1px !important;
            fill: white !important;
            stroke: black !important;
        }
        .blocklyText {
            fill: #000 !important;
        }
        rect.blocklyMainBackground {
            fill: white !important;
        }
        rect.blocklyBlockBackground {
            stroke: black !important;
            fill: white !important;
        }
        rect.blocklyFieldRect {
            fill: white !important;
            stroke: white !important;
        }
        rect.blocklyDropdownRect {
            stroke: white !important;
            fill: white !important;
        }
        .blocklyDropdownText {
            //stroke: black !important;
            fill: black !important;
        }
        .blocklyNonEditableText > text,
        .blocklyEditableText > text {
            //stroke: black !important;
            fill: black !important;
        }
        image {
            filter: grayscale(1);
        }

        .print-renderer.spike-theme .blocklyText,
        .print-renderer.spike-theme .blocklyFlyoutLabelText {
            font:
                bold 12pt 'Helvetica Neue',
                'Segoe UI',
                Helvetica,
                sans-serif;
        }
        .print-renderer.spike-theme .blocklyTextInputBubble textarea {
            font-weight: normal;
        }
        .print-renderer.spike-theme .blocklyText {
            fill: #fff;
        }
        .print-renderer.spike-theme .blocklyNonEditableText > rect:not(.blocklyDropdownRect),
        .print-renderer.spike-theme .blocklyEditableText > rect:not(.blocklyDropdownRect) {
            fill: #fff;
        }
        .print-renderer.spike-theme .blocklyNonEditableText > text,
        .print-renderer.spike-theme .blocklyEditableText > text,
        .print-renderer.spike-theme .blocklyNonEditableText > g > text,
        .print-renderer.spike-theme .blocklyEditableText > g > text {
            fill: #575e75;
        }
        .print-renderer.spike-theme .blocklyFlyoutLabelText {
            fill: #575e75;
        }
        .print-renderer.spike-theme .blocklyText.blocklyBubbleText {
            fill: #575e75;
        }
        .print-renderer.spike-theme
            .blocklyDraggable:not(.blocklyDisabled)
            .blocklyEditableText:not(.editing):hover
            > rect,
        .print-renderer.spike-theme
            .blocklyDraggable:not(.blocklyDisabled)
            .blocklyEditableText:not(.editing):hover
            > .blocklyPath {
            stroke: #fff;
            stroke-width: 2;
        }
        .print-renderer.spike-theme .blocklyHtmlInput {
            font-family: 'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif;
            font-weight: bold;
            color: #575e75;
        }
        .print-renderer.spike-theme .blocklyDropdownText {
            fill: black !important;
        }
        .print-renderer.spike-theme.blocklyWidgetDiv .goog-menuitem,
        .print-renderer.spike-theme.blocklyDropDownDiv .goog-menuitem {
            font-family: 'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif;
        }
        .print-renderer.spike-theme.blocklyDropDownDiv .goog-menuitem-content {
            color: #fff;
        }
        .print-renderer.spike-theme .blocklyHighlightedConnectionPath {
            stroke: #4eff4e;
        }
        .print-renderer.spike-theme .blocklyDisabled > .blocklyOutlinePath {
            fill: url(#blocklyDisabledPattern2909471669365986);
        }
        .print-renderer.spike-theme .blocklyInsertionMarker > .blocklyPath {
            fill-opacity: 0.2;
            stroke: none;
        }
    </style>
{/if}
