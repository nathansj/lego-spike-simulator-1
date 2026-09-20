<script lang="ts">
    import * as Blockly from 'blockly/core';
    import { Button, Tooltip } from 'flowbite-svelte';
    import {
        AdjustmentsHorizontalOutline,
        AdjustmentsVerticalOutline,
        BugOutline,
        ChevronDownOutline,
        CloseOutline,
        CogOutline,
        DatabaseOutline,
        EyeOutline,
        FloppyDiskOutline,
        FolderOpenOutline,
        FolderPlusOutline,
        GridOutline,
        HomeOutline,
        MapPinAltOutline,
        PlayOutline,
        ShareNodesOutline,
        StopOutline,
        ToolsOutline,
        TrashBinOutline,
        UploadOutline
    } from 'flowbite-svelte-icons';
    import MenuDropdown from '$components/MenuDropdown.svelte';
    import { type MenuAction } from '$components/Menu.svelte';
    import SeasonSelection from '$components/SeasonSelection.svelte';
    import SeasonMissionReadiness from '$components/SeasonMissionReadiness.svelte';
    import SpikeSimulator from '$components/SpikeSimulator.svelte';
    import SaveSimulation from '$components/SaveSimulation.svelte';
    import SimulatorSettings from '$components/SimulatorSettings.svelte';
    import PortConnector from '$components/PortConnector.svelte';
    import WheelConnector from '$components/WheelConnector.svelte';
    import LoadScene from '$components/LoadScene.svelte';
    import PracticeReadinessShell from '$components/PracticeReadinessShell.svelte';
    import type { DroneSurveyObservationGeometry } from '$lib/fll/drone-survey-observations';
    import {
        parseDroneSurveyObservationGeometryProfile,
        type DroneSurveyObservationGeometryProfile
    } from '$lib/fll/drone-survey-observation-geometry-profile';
    import { type LDrawStore, componentStore, saveMPD } from '$lib/ldraw/components';
    import {
        ForceSensor,
        Hub,
        LightSensor,
        Motor,
        Port,
        UltraSoundSensor,
        Wheel,
        allPorts,
        codeStore,
        type PortType
    } from '$lib/spike/vm';
    import { boundaryStore } from '$lib/spike/scene';
    import {
        getStartDelay,
        getStepSleep,
        getTimeFactor,
        setStartDelay,
        setStepSleep,
        setTimeFactor
    } from '$lib/spike/vm';
    import type { ProjectArchiveProjectPayload } from '$lib/spike/project-archive';
    import { serializeSceneDefinition } from '$lib/spike/scene-schema';
    import {
        canProceedWithDestructiveAction,
        projectDirtyStore,
        shouldConfirmDestructiveAction
    } from '$lib/spike/project-dirty-state';
    import { projectRevision } from '$lib/spike/project-contract';
    import type { SeasonPackage } from '$lib/fll/season-package';
    import {
        spikeGenerator,
        resetCode,
        getCodeEvents,
        getCodeProcedures
    } from '$lib/blockly/generator';
    import { sceneStore } from '$lib/spike/scene';
    import {
        getDefaultSeasonPackage,
        getSeasonPackage,
        listSeasonPackages
    } from '$lib/fll/season-package';
    import { isPracticeRunReady, type PracticeRunReadiness } from '$lib/fll/practice-run-gate';
    import UnsavedChangesModal from '$components/UnsavedChangesModal.svelte';
    import { onDestroy, onMount } from 'svelte';

    export let modalOpen = false;
    export let blocklyOpen: boolean;
    export let workspace: Blockly.WorkspaceSvg | undefined;
    export let split = 2;
    export let activePane: 'program' | 'simulator' = 'program';
    let hub = new Hub();
    let observedWorkspace: Blockly.WorkspaceSvg | undefined;
    let workspaceReadinessListener: ((event: Blockly.Events.Abstract) => void) | undefined;
    let programReady = false;

    let connectorOpen = false;
    let wheelsOpen = false;
    let saveOpen = false;
    let sceneOpen = false;
    let settingsOpen = false;
    let workspaceMode: 'practice' | 'expert' | 'diagnostics' = 'practice';
    let robotButtonColour: 'light' | 'red' | 'green' = 'light';
    let libraryClass = '!p-2';
    export let runSimulation = false;
    export let practiceReady = false;
    let simulatorMenuOpen = false;
    // cameraOpen is used as a bind variable, but reported as unused by es-lint
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let cameraOpen = false;
    let camera: 'top' | 'left' | 'right' | 'front' | 'back' | 'adaptive' = 'adaptive';
    let robotFocus = false;
    let tilt = true;
    let gridScale = 0;
    let m01ObservationGeometry: DroneSurveyObservationGeometry | undefined;
    let m01ObservationProfile: DroneSurveyObservationGeometryProfile | undefined;
    let m01ProfileFileName: string | undefined;
    let m01ProfileStatus =
        'M01 scoring is disabled until a user-supplied calibration profile is loaded.';
    let m01ProfileError: string | undefined;
    let m01ProfileLoadGeneration = 0;
    let robotModelGeneration = 0;
    let loadVirtualReferenceRobot = false;
    const defaultSeasonPackage = getDefaultSeasonPackage();
    let activeSeasonPackage: SeasonPackage | undefined = defaultSeasonPackage;
    let selectedSeasonId = defaultSeasonPackage.id;
    let selectedMissionId = defaultSeasonPackage.missions[0]?.id ?? '';
    let seasonSelectionConfirmationOpen = false;
    let pendingSeasonId: string | undefined;
    let projectRestoreStatus = `${defaultSeasonPackage.name} selected. Complete the setup items to run a practice program.`;
    let projectRestoreError: string | undefined;
    let observedProjectRevision = '';
    let dirtyTrackingReady = false;
    let observedSceneState: unknown;
    let observedComponentState: unknown;
    let observedBoundaryState: unknown;

    let cameraMenu = buildCameraMenu();

    function buildCameraMenu(): MenuAction[] {
        return [
            {
                name: 'Default view',
                action: () => {
                    camera = 'adaptive';
                    tilt = true;
                    robotFocus = false;
                    cameraMenu = buildCameraMenu();
                },
                radio: camera == 'adaptive'
            },
            {
                name: 'View left',
                action: () => {
                    camera = 'left';
                    cameraMenu = buildCameraMenu();
                },
                radio: camera == 'left'
            },
            {
                name: 'View right',
                action: () => {
                    camera = 'right';
                    cameraMenu = buildCameraMenu();
                },
                radio: camera == 'right'
            },
            {
                name: 'View back',
                action: () => {
                    camera = 'back';
                    cameraMenu = buildCameraMenu();
                },
                radio: camera == 'back'
            },
            {
                name: 'View front',
                action: () => {
                    camera = 'front';
                    cameraMenu = buildCameraMenu();
                },
                radio: camera == 'front'
            },
            {
                name: 'View top',
                action: () => {
                    camera = 'top';
                    tilt = false;
                    robotFocus = false;
                    cameraMenu = buildCameraMenu();
                },
                radio: camera == 'top'
            },
            {
                name: 'Tilt view',
                action: () => {
                    tilt = !tilt;
                    cameraMenu = buildCameraMenu();
                },
                toggle: tilt
            },
            {
                name: 'Robot view',
                action: () => {
                    robotFocus = !robotFocus;
                    if (robotFocus) {
                        camera = 'back';
                        tilt = true;
                    }
                    cameraMenu = buildCameraMenu();
                },
                toggle: robotFocus
            },
            {
                name: 'Grid scale',
                action: () => {},
                submenu: {
                    name: 'Grid scale',
                    actions: [
                        {
                            name: 'Off',
                            action: () => {
                                gridScale = 0;
                                cameraMenu = buildCameraMenu();
                            },
                            radio: gridScale == 0
                        },
                        {
                            name: '100 mm',
                            action: () => {
                                gridScale = 100;
                                cameraMenu = buildCameraMenu();
                            },
                            radio: gridScale == 100
                        },
                        {
                            name: '250 mm',
                            action: () => {
                                gridScale = 250;
                                cameraMenu = buildCameraMenu();
                            },
                            radio: gridScale == 250
                        },
                        {
                            name: '500 mm',
                            action: () => {
                                gridScale = 500;
                                cameraMenu = buildCameraMenu();
                            },
                            radio: gridScale == 500
                        }
                    ]
                }
            }
        ];
    }

    function closeWindow() {
        modalOpen = false;
    }

    function openBlockly() {
        blocklyOpen = true;
    }

    function askForRobot() {
        workspaceMode = 'expert';
        const element = document.getElementById('load_robot');
        if (element) {
            element.click();
        }
    }

    function askForLibrary() {
        workspaceMode = 'expert';
        const element = document.getElementById('load_library');
        if (element) {
            element.click();
        }
    }

    function updateButtons(store: LDrawStore) {
        if (!store.robotModel) {
            robotButtonColour = 'light';
        } else {
            if (store.unresolved.length > 0 || (store.missing?.length ?? 0) > 0) {
                robotButtonColour = 'red';
            } else {
                robotButtonColour = 'green';
            }
        }
        if (store.unresolved.length > 0 || (store.missing?.length ?? 0) > 0) {
            libraryClass = '!p-2 animate-bounce';
        } else {
            libraryClass = '!p-2';
        }
    }

    function startRobot() {
        if (!practiceReady) {
            projectRestoreStatus =
                'Run is blocked until Season, Field, Robot, Drive wheels, and Program are ready.';
            return;
        }
        resetCode();
        const code = spikeGenerator.workspaceToCode(workspace);
        console.log('=======');
        console.log(code);
        console.log('=======');
        console.log(getCodeProcedures());
        codeStore.set({ events: getCodeEvents(), procedures: getCodeProcedures() });
        runSimulation = true;
    }

    function updateProgramReadiness(): void {
        programReady = workspace !== undefined && workspace.getTopBlocks(false).length > 0;
    }

    $: if (workspace !== observedWorkspace) {
        if (observedWorkspace && workspaceReadinessListener) {
            observedWorkspace.removeChangeListener(workspaceReadinessListener);
        }
        observedWorkspace = workspace;
        if (workspace) {
            workspaceReadinessListener = (event: Blockly.Events.Abstract) => {
                if (event.isUiEvent) return;
                updateProgramReadiness();
            };
            workspace.addChangeListener(workspaceReadinessListener);
        } else {
            workspaceReadinessListener = undefined;
        }
        updateProgramReadiness();
    }

    onDestroy(() => {
        if (observedWorkspace && workspaceReadinessListener) {
            observedWorkspace.removeChangeListener(workspaceReadinessListener);
        }
    });

    $: practiceReadiness = {
        seasonReady: activeSeasonPackage !== undefined,
        fieldReady: $sceneStore.objects.length > 0,
        robotReady: $componentStore.robotModel !== undefined,
        driveReady:
            hub.wheels.length >= 2 &&
            hub.wheels.every((wheel) => hub.ports[wheel.port].type === 'motor'),
        programReady
    } satisfies PracticeRunReadiness;
    $: practiceReady = isPracticeRunReady(practiceReadiness);
    $: practiceRunLabel = runSimulation
        ? 'Stop run'
        : practiceReady
          ? 'Run program'
          : nextActionLabel();

    function stopRobot() {
        runSimulation = false;
    }

    function nextSetupItem():
        | 'Season'
        | 'Field'
        | 'Robot'
        | 'Drive wheels'
        | 'Program'
        | undefined {
        if (!practiceReadiness.seasonReady) return 'Season';
        if (!practiceReadiness.fieldReady) return 'Field';
        if (!practiceReadiness.robotReady) return 'Robot';
        if (!practiceReadiness.driveReady) return 'Drive wheels';
        if (!practiceReadiness.programReady) return 'Program';
        return undefined;
    }

    function nextActionLabel(): string {
        switch (nextSetupItem()) {
            case 'Season':
                return 'Choose challenge';
            case 'Field':
                return 'Open Expert Setup';
            case 'Robot':
                return 'Open Expert Setup';
            case 'Drive wheels':
                return 'Open Expert Setup';
            case 'Program':
                return 'Open program';
            default:
                return 'Review setup';
        }
    }

    function openNextSetupItem(): void {
        switch (nextSetupItem()) {
            case 'Season':
                openSeasonSelection();
                break;
            case 'Field':
                openPracticeField();
                break;
            case 'Robot':
                askForRobot();
                break;
            case 'Drive wheels':
                connectWheels();
                break;
            case 'Program':
                blocklyOpen = true;
                activePane = 'program';
                break;
        }
    }

    export function runOrCorrect(): void {
        if (runSimulation) {
            stopRobot();
        } else if (practiceReady) {
            startRobot();
        } else {
            openNextSetupItem();
        }
    }

    function closeSimulatorMenu(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            simulatorMenuOpen = false;
        }
    }

    function currentProjectRevision(): string {
        const scene = $sceneStore;
        return projectRevision({
            scene: serializeSceneDefinition(scene),
            map: scene.map
                ? { present: true, size: scene.map.size, type: scene.map.type }
                : { present: false },
            robot: $componentStore.robotModel ? saveMPD($componentStore.robotModel) : undefined,
            hub: {
                ports: allPorts.map((port) => ({
                    port,
                    type: hub.ports[port].type,
                    componentId: hub.ports[port].id()
                })),
                wheels: hub.wheels.map((wheel) => ({
                    port: wheel.port,
                    componentId: wheel.id,
                    radiusMm: wheel.radius,
                    gearing: wheel.gearing,
                    positionMm: { ...wheel.position },
                    direction: { ...wheel.direction }
                }))
            },
            settings: {
                stepTimeMs: getStepSleep(),
                startDelayMs: getStartDelay(),
                timeScale: getTimeFactor(),
                boundary: $boundaryStore
            },
            program: workspace ? Blockly.serialization.workspaces.save(workspace) : undefined,
            season: activeSeasonPackage?.id ?? 'unselected',
            calibration: m01ObservationProfile
        });
    }

    function markProjectChanged(): void {
        const revision = currentProjectRevision();
        observedProjectRevision = revision;
        projectDirtyStore.markChanged(revision);
    }

    function markProjectSaved(revision: string): void {
        observedProjectRevision = currentProjectRevision();
        projectDirtyStore.markSaved(revision);
    }

    function markProjectLoaded(): void {
        observedProjectRevision = currentProjectRevision();
        projectDirtyStore.markLoaded(observedProjectRevision);
    }

    function saveRobotOrScene() {
        saveOpen = true;
    }

    function connectPorts() {
        workspaceMode = 'expert';
        connectorOpen = true;
    }

    function connectWheels() {
        workspaceMode = 'expert';
        wheelsOpen = true;
    }

    function loadScene() {
        workspaceMode = 'expert';
        sceneOpen = true;
    }

    function openSettings() {
        settingsOpen = true;
    }

    function openPracticeField(): void {
        workspaceMode = 'expert';
        loadScene();
    }

    function openSeasonSelection(): void {
        workspaceMode = 'expert';
        const element = document.getElementById('season-selection-title');
        element?.scrollIntoView({ block: 'nearest' });
    }

    function handleSeasonSelect(event: CustomEvent<string>): void {
        requestSeasonSelection(event.detail);
    }

    function applySeasonSelection(seasonId: string): void {
        const seasonPackage = seasonId ? getSeasonPackage(seasonId) : undefined;
        if (seasonId && !seasonPackage) {
            projectRestoreStatus = `Season package "${seasonId}" is not available in this app build.`;
            return;
        }
        activeSeasonPackage = seasonPackage;
        selectedSeasonId = seasonPackage?.id ?? '';
        selectedMissionId = seasonPackage?.missions[0]?.id ?? '';
        projectRestoreStatus = seasonPackage
            ? `${seasonPackage.name} selected. Current scene was not replaced.`
            : 'No season selected. Choose a package before running a practice program.';
        markProjectChanged();
    }

    function requestSeasonSelection(seasonId: string): void {
        if (seasonId === selectedSeasonId) return;
        pendingSeasonId = seasonId;
        if (shouldConfirmDestructiveAction($projectDirtyStore)) {
            seasonSelectionConfirmationOpen = true;
            return;
        }
        applySeasonSelection(seasonId);
    }

    function cancelSeasonSelection(): void {
        pendingSeasonId = undefined;
        seasonSelectionConfirmationOpen = false;
        selectedSeasonId = activeSeasonPackage?.id ?? '';
    }

    function continueSeasonSelection(): void {
        const seasonId = pendingSeasonId;
        pendingSeasonId = undefined;
        seasonSelectionConfirmationOpen = false;
        if (
            seasonId !== undefined &&
            canProceedWithDestructiveAction($projectDirtyStore, 'discard')
        ) {
            applySeasonSelection(seasonId);
        }
    }

    async function loadM01ObservationProfile(event: Event): Promise<void> {
        const loadGeneration = ++m01ProfileLoadGeneration;
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        m01ObservationGeometry = undefined;
        m01ObservationProfile = undefined;
        m01ProfileFileName = undefined;
        m01ProfileError = undefined;

        if (!file) {
            m01ProfileStatus =
                'M01 scoring is disabled until a user-supplied calibration profile is loaded.';
            return;
        }

        try {
            const profileText = await file.text();
            if (loadGeneration !== m01ProfileLoadGeneration) return;
            const profile = parseDroneSurveyObservationGeometryProfile(profileText);
            m01ObservationProfile = profile;
            m01ObservationGeometry = profile.geometry;
            m01ProfileFileName = file.name;
            m01ProfileStatus = `User-supplied M01 calibration profile loaded: ${file.name}.`;
            markProjectChanged();
        } catch (error) {
            if (loadGeneration !== m01ProfileLoadGeneration) return;
            m01ProfileError =
                error instanceof Error
                    ? error.message
                    : 'The calibration profile could not be read.';
            m01ProfileStatus =
                'M01 scoring is disabled because the selected calibration profile is invalid.';
            markProjectChanged();
        }
    }

    function clearM01ObservationProfile(): void {
        m01ProfileLoadGeneration++;
        m01ObservationGeometry = undefined;
        m01ObservationProfile = undefined;
        m01ProfileFileName = undefined;
        m01ProfileError = undefined;
        m01ProfileStatus =
            'M01 scoring is disabled until a user-supplied calibration profile is loaded.';
        markProjectChanged();
        const input = document.getElementById('m01-calibration-profile') as HTMLInputElement | null;
        if (input) input.value = '';
    }

    function applyM01ObservationProfile(
        profile: DroneSurveyObservationGeometryProfile | undefined
    ): void {
        m01ObservationProfile = profile;
        m01ObservationGeometry = profile?.geometry;
        m01ProfileFileName = profile ? 'profile from saved scene' : undefined;
        m01ProfileError = undefined;
        m01ProfileStatus = profile
            ? 'User-supplied M01 calibration profile restored from the saved scene.'
            : 'M01 scoring is disabled until a user-supplied calibration profile is loaded.';
    }

    function handleRobotModelLoaded(): void {
        robotModelGeneration += 1;
    }

    function restorePort(port: PortType, type: string, componentId: number | 'none'): void {
        if (!allPorts.includes(port)) throw new Error(`Unsupported saved hub port "${port}".`);
        const portType = ['none', 'force', 'distance', 'light', 'motor'].includes(type)
            ? (type as Port['type'])
            : undefined;
        if (!portType) throw new Error(`Unsupported saved port type "${type}" on port ${port}.`);
        if ((portType === 'none') !== (componentId === 'none')) {
            throw new Error(`Saved port ${port} has an inconsistent component assignment.`);
        }
        const restored = new Port(portType);
        if (componentId !== 'none') {
            if (portType === 'motor') restored.motor = new Motor(componentId);
            if (portType === 'light') restored.light = new LightSensor(componentId);
            if (portType === 'distance') restored.ultra = new UltraSoundSensor(componentId);
            if (portType === 'force') restored.force = new ForceSensor(componentId);
        }
        hub.ports[port] = restored;
    }

    function restoreProjectRobotSetup(payload: ProjectArchiveProjectPayload): void {
        hub.reload();
        for (const savedPort of payload.project.robotSetup.ports) {
            restorePort(savedPort.port as PortType, savedPort.type, savedPort.componentId);
        }
        hub.wheels = payload.project.robotSetup.wheels.map((savedWheel) => {
            const wheelPort = savedWheel.port as PortType;
            if (!allPorts.includes(wheelPort)) {
                throw new Error(`Unsupported saved wheel port "${savedWheel.port}".`);
            }
            const wheel = new Wheel(
                savedWheel.componentId,
                savedWheel.radiusMm,
                savedWheel.gearing,
                wheelPort,
                []
            );
            wheel.position = { ...savedWheel.positionMm };
            wheel.direction = { ...savedWheel.direction };
            return wheel;
        });
        hub = hub;
    }

    function restoreProjectProgram(payload: ProjectArchiveProjectPayload): void {
        if (!workspace) {
            if (payload.project.program.restoreSupported) {
                throw new Error(
                    'The saved Blockly program cannot be restored before the code panel is ready.'
                );
            }
            return;
        }
        workspace.clear();
        if (payload.program) Blockly.serialization.workspaces.load(payload.program, workspace);
    }

    function restoreProjectSettings(payload: ProjectArchiveProjectPayload): void {
        const settings = payload.project.participantSettings;
        setStepSleep(settings.simulation.stepTimeMs);
        setStartDelay(settings.simulation.startDelayMs);
        setTimeFactor(settings.simulation.timeScale);
        boundaryStore.set({
            scale: settings.display.boundaryScale,
            draw: settings.display.drawBoundary,
            collisions: settings.display.showBoundaryCollisions,
            debugPhysics: settings.display.showPhysicsDebug
        });
    }

    async function restoreProject(payload: ProjectArchiveProjectPayload): Promise<void> {
        projectRestoreError = undefined;
        try {
            restoreProjectRobotSetup(payload);
            restoreProjectProgram(payload);
            restoreProjectSettings(payload);
            const reference = payload.project.season.reference;
            const restoredSeasonPackage =
                payload.project.season.status === 'selected'
                    ? getSeasonPackage(reference.id)
                    : undefined;
            if (restoredSeasonPackage) {
                activeSeasonPackage = restoredSeasonPackage;
                selectedSeasonId = restoredSeasonPackage.id;
                selectedMissionId = restoredSeasonPackage.missions[0]?.id ?? '';
                projectRestoreStatus = `Project restored for ${reference.name}. Season assets remain app-provided; the archive does not embed a season package.`;
            } else if (payload.project.season.status === 'unselected') {
                activeSeasonPackage = undefined;
                selectedSeasonId = '';
                selectedMissionId = '';
                projectRestoreStatus = 'Project restored without a selected season package.';
            } else {
                activeSeasonPackage = undefined;
                selectedSeasonId = '';
                selectedMissionId = '';
                projectRestoreStatus = `Project scene restored, but season "${reference.name}" is not available in this app build.`;
            }
        } catch (error) {
            projectRestoreError =
                error instanceof Error
                    ? error.message
                    : 'Saved project settings could not be restored.';
            projectRestoreStatus = 'Project scene loaded, but some saved setup was not restored.';
        }
        markProjectLoaded();
    }

    $: updateButtons($componentStore);
    $: {
        const sceneState = $sceneStore;
        const componentState = $componentStore;
        const boundaryState = $boundaryStore;
        const revision = currentProjectRevision();
        if (!observedProjectRevision) {
            observedProjectRevision = revision;
        } else if (
            dirtyTrackingReady &&
            (revision !== observedProjectRevision ||
                (observedSceneState !== undefined && observedSceneState !== sceneState) ||
                (observedComponentState !== undefined &&
                    observedComponentState !== componentState) ||
                (observedBoundaryState !== undefined && observedBoundaryState !== boundaryState))
        ) {
            observedProjectRevision = revision;
            projectDirtyStore.markChanged(revision);
        }
        observedSceneState = sceneState;
        observedComponentState = componentState;
        observedBoundaryState = boundaryState;
    }

    onMount(() => {
        observedProjectRevision = currentProjectRevision();
        observedSceneState = $sceneStore;
        observedComponentState = $componentStore;
        observedBoundaryState = $boundaryStore;
        projectDirtyStore.markLoaded(observedProjectRevision);
        dirtyTrackingReady = true;
    });
</script>

<PortConnector bind:modalOpen={connectorOpen} bind:hub on:change={markProjectChanged} />
<WheelConnector bind:modalOpen={wheelsOpen} bind:hub on:change={markProjectChanged} />
<SaveSimulation
    bind:modalOpen={saveOpen}
    bind:hub
    {workspace}
    {m01ObservationProfile}
    seasonPackage={activeSeasonPackage}
    onProjectSaved={markProjectSaved}
/>
<LoadScene
    bind:modalOpen={sceneOpen}
    onM01ObservationProfileLoaded={applyM01ObservationProfile}
    onRobotModelLoaded={handleRobotModelLoaded}
    onProjectArchiveLoaded={restoreProject}
    onSceneLoaded={markProjectLoaded}
/>
<SimulatorSettings bind:modalOpen={settingsOpen} on:change={markProjectChanged} />
{#if modalOpen}
    <div
        class="{activePane === 'simulator' ? 'flex' : 'hidden lg:flex'} {split == 1
            ? 'lg:flex-1'
            : 'lg:flex-[2]'} min-h-0 min-w-0 w-full flex-1 overflow-hidden"
    >
        <div class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
                class="{workspaceMode === 'practice'
                    ? 'shrink-0'
                    : 'min-h-0 max-h-[45%]'} overflow-y-auto overscroll-contain"
            >
                <div class="border-b border-slate-200 bg-white px-3 py-2">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <div
                                role="group"
                                aria-label="Workspace mode"
                                class="flex items-center gap-1"
                            >
                                <button
                                    type="button"
                                    class="icon-btn rounded p-1 {workspaceMode === 'practice'
                                        ? 'bg-blue-700 text-white'
                                        : 'text-slate-700 hover:bg-slate-100'}"
                                    aria-current={workspaceMode === 'practice' ? 'page' : undefined}
                                    aria-label="Practice"
                                    title="Practice"
                                    on:click={() => (workspaceMode = 'practice')}
                                >
                                    <HomeOutline size="sm" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    class="icon-btn rounded p-1 {workspaceMode === 'expert'
                                        ? 'bg-blue-700 text-white'
                                        : 'text-slate-700 hover:bg-slate-100'}"
                                    aria-current={workspaceMode === 'expert' ? 'page' : undefined}
                                    aria-label="Expert Setup"
                                    title="Expert Setup"
                                    on:click={() => (workspaceMode = 'expert')}
                                >
                                    <AdjustmentsVerticalOutline size="sm" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    class="icon-btn rounded p-1 {workspaceMode === 'diagnostics'
                                        ? 'bg-blue-700 text-white'
                                        : 'text-slate-700 hover:bg-slate-100'}"
                                    aria-current={workspaceMode === 'diagnostics'
                                        ? 'page'
                                        : undefined}
                                    aria-label="Developer Diagnostics"
                                    title="Developer Diagnostics"
                                    on:click={() => (workspaceMode = 'diagnostics')}
                                >
                                    <BugOutline size="sm" aria-hidden="true" />
                                </button>
                            </div>
                            <div class="h-5 w-px bg-slate-300" aria-hidden="true"></div>
                            {#if workspaceMode === 'practice'}
                                <div class="min-w-0">
                                    <p
                                        id="practice-title"
                                        class="text-sm font-semibold text-slate-900"
                                    >
                                        Practice
                                    </p>
                                    <p class="truncate text-xs text-slate-600">
                                        {activeSeasonPackage
                                            ? `${activeSeasonPackage.name} · ${activeSeasonPackage.edition} · rev ${activeSeasonPackage.revision}`
                                            : 'No season selected'}
                                    </p>
                                </div>
                            {/if}
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button
                                color={runSimulation ? 'red' : practiceReady ? 'green' : 'light'}
                                size="sm"
                                aria-label={practiceRunLabel}
                                title={practiceRunLabel}
                                on:click={runOrCorrect}
                            >
                                {#if runSimulation}
                                    <StopOutline size="md" aria-hidden="true" />
                                {:else if practiceReady}
                                    <PlayOutline size="md" aria-hidden="true" />
                                {:else}
                                    <ToolsOutline size="md" aria-hidden="true" />
                                {/if}
                            </Button>
                            <Button
                                color="light"
                                size="xs"
                                aria-label="Save project"
                                title="Save project"
                                on:click={saveRobotOrScene}
                            >
                                <FloppyDiskOutline size="sm" aria-hidden="true" />
                            </Button>
                            <span
                                class="text-xs font-medium {$projectDirtyStore.dirty
                                    ? 'text-amber-800'
                                    : 'text-slate-600'}"
                            >
                                {$projectDirtyStore.dirty ? 'Unsaved changes' : 'Saved'}
                            </span>
                            <div class="relative">
                                <button
                                    type="button"
                                    class="icon-btn border border-slate-300 px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    aria-haspopup="menu"
                                    aria-expanded={simulatorMenuOpen}
                                    aria-label="Simulator view"
                                    title="Simulator view"
                                    on:click={() => (simulatorMenuOpen = !simulatorMenuOpen)}
                                    on:keydown={closeSimulatorMenu}
                                >
                                    <GridOutline size="sm" aria-hidden="true" />
                                    <ChevronDownOutline size="xs" aria-hidden="true" />
                                </button>
                                {#if simulatorMenuOpen}
                                    <div
                                        class="absolute right-0 top-full z-30 mt-1 w-56 rounded border border-slate-200 bg-white p-1 shadow-lg"
                                        role="menu"
                                    >
                                        <button
                                            type="button"
                                            class="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                                            role="menuitem"
                                            on:click={() => {
                                                robotFocus = true;
                                                camera = 'back';
                                                tilt = true;
                                                cameraMenu = buildCameraMenu();
                                                simulatorMenuOpen = false;
                                            }}>Focus robot</button
                                        >
                                        <button
                                            type="button"
                                            class="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                                            role="menuitem"
                                            on:click={() => {
                                                camera = 'adaptive';
                                                tilt = true;
                                                robotFocus = false;
                                                cameraMenu = buildCameraMenu();
                                                simulatorMenuOpen = false;
                                            }}>Default view</button
                                        >
                                    </div>
                                {/if}
                            </div>
                            {#if blocklyOpen}
                                <button
                                    type="button"
                                    class="icon-btn p-1 text-slate-600 hover:bg-slate-100"
                                    aria-label="Close simulator"
                                    title="Close simulator"
                                    on:click={closeWindow}
                                >
                                    <CloseOutline size="sm" aria-hidden="true" />
                                </button>
                            {/if}
                        </div>
                    </div>
                    {#if workspaceMode === 'practice'}
                        <p
                            class="mt-2 text-sm {practiceReady
                                ? 'text-green-800'
                                : 'text-amber-900'}"
                            role="status"
                        >
                            {#if runSimulation}
                                Running. Stop run to inspect the current table.
                            {:else if practiceReady}
                                Your table, robot, and program are ready.
                            {:else}
                                {nextSetupItem()} needs setup. {nextSetupItem() === 'Program'
                                    ? 'Add a starting block before running.'
                                    : 'Fix setup in Expert Setup.'}
                            {/if}
                        </p>
                    {/if}
                </div>
                {#if workspaceMode !== 'practice'}
                    <PracticeReadinessShell
                        {runSimulation}
                        seasonReady={activeSeasonPackage !== undefined}
                        seasonLabel={activeSeasonPackage?.name ?? 'No season selected'}
                        missionLabel={activeSeasonPackage?.missions.find(
                            (mission) => mission.id === selectedMissionId
                        )?.name ?? 'No mission selected'}
                        missionCount={activeSeasonPackage?.missions.length ?? 0}
                        {workspaceMode}
                        robotReady={$componentStore.robotModel !== undefined}
                        fieldReady={$sceneStore.objects.length > 0}
                        driveReady={hub.wheels.length >= 2 &&
                            hub.wheels.every((wheel) => hub.ports[wheel.port].type === 'motor')}
                        {programReady}
                        on:robot={askForRobot}
                        on:drive={connectWheels}
                        on:field={openPracticeField}
                        on:program={openBlockly}
                        on:season={openSeasonSelection}
                    />
                {/if}
                {#if workspaceMode === 'expert'}
                    <SeasonSelection
                        packages={listSeasonPackages()}
                        selectedId={selectedSeasonId}
                        selectedPackage={activeSeasonPackage}
                        on:select={handleSeasonSelect}
                    />
                    <SeasonMissionReadiness
                        seasonPackage={activeSeasonPackage}
                        bind:selectedMissionId
                    />
                {/if}
                {#if workspaceMode === 'expert'}
                    <section
                        class="shrink-0 border-b border-b-gray-300 bg-gray-50 p-3"
                        aria-labelledby="expert-setup-title"
                    >
                        <div class="flex flex-wrap items-baseline justify-between gap-2">
                            <div>
                                <h2 id="expert-setup-title" class="font-semibold text-slate-900">
                                    Expert Setup
                                </h2>
                                <p class="text-sm text-slate-600">
                                    Change the field, robot, wheels, attachments, and saved setup.
                                </p>
                            </div>
                            <Button
                                color="light"
                                size="xs"
                                aria-label="Save or export setup"
                                title="Save or export setup"
                                on:click={saveRobotOrScene}
                            >
                                <FloppyDiskOutline size="sm" aria-hidden="true" />
                            </Button>
                        </div>
                        <p class="mt-2 text-xs text-slate-600">
                            Camera and grid choices are display-only. Field, robot, port, wheel,
                            attachment, calibration, and simulation changes are saved setup inputs;
                            apply them with Reset run before the next run.
                        </p>
                        <div class="mt-3 grid gap-3 lg:grid-cols-3">
                            <section aria-labelledby="prepared-setup-title">
                                <h3
                                    id="prepared-setup-title"
                                    class="text-sm font-semibold text-slate-800"
                                >
                                    Prepared setup
                                </h3>
                                <div class="mt-1 flex flex-wrap gap-2">
                                    <Button
                                        color="light"
                                        size="xs"
                                        aria-label="Load project or field"
                                        title="Load project or field"
                                        on:click={loadScene}
                                    >
                                        <FolderOpenOutline size="sm" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        color="light"
                                        size="xs"
                                        class={libraryClass}
                                        aria-label="Load missing parts"
                                        title="Load missing parts"
                                        on:click={askForLibrary}
                                    >
                                        <DatabaseOutline size="sm" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        color="light"
                                        size="xs"
                                        aria-label="Choose LDraw folder"
                                        title="Choose LDraw folder"
                                        on:click={() =>
                                            document
                                                .getElementById('select_library_folder')
                                                ?.click()}
                                    >
                                        <FolderPlusOutline size="sm" aria-hidden="true" />
                                    </Button>
                                </div>
                            </section>
                            <section aria-labelledby="robot-setup-title">
                                <h3
                                    id="robot-setup-title"
                                    class="text-sm font-semibold text-slate-800"
                                >
                                    Robot
                                </h3>
                                <div class="mt-1 flex flex-wrap gap-2">
                                    <Button
                                        color={robotButtonColour}
                                        size="xs"
                                        aria-label="Load robot"
                                        title="Load robot"
                                        on:click={askForRobot}
                                    >
                                        <UploadOutline size="sm" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        color="light"
                                        size="xs"
                                        aria-label="Reference robot"
                                        title="Reference robot"
                                        on:click={() => (loadVirtualReferenceRobot = true)}
                                    >
                                        <MapPinAltOutline size="sm" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        color="light"
                                        size="xs"
                                        aria-label="Ports"
                                        title="Ports"
                                        on:click={connectPorts}
                                    >
                                        <ShareNodesOutline size="sm" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        color="light"
                                        size="xs"
                                        aria-label="Drive wheels"
                                        title="Drive wheels"
                                        on:click={connectWheels}
                                    >
                                        <CogOutline size="sm" aria-hidden="true" />
                                    </Button>
                                </div>
                            </section>
                            <section aria-labelledby="advanced-setup-title">
                                <h3
                                    id="advanced-setup-title"
                                    class="text-sm font-semibold text-slate-800"
                                >
                                    Mission and advanced
                                </h3>
                                <div class="mt-1 flex flex-wrap gap-2">
                                    <Button
                                        color="light"
                                        size="xs"
                                        aria-label="Simulation settings"
                                        title="Simulation settings"
                                        on:click={openSettings}
                                    >
                                        <AdjustmentsHorizontalOutline
                                            size="sm"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                    <Button
                                        id="camera_config_button"
                                        color="light"
                                        size="xs"
                                        aria-label="Display options"
                                        title="Display options"
                                    >
                                        <EyeOutline size="sm" aria-hidden="true" />
                                    </Button>
                                    <MenuDropdown
                                        name="camera"
                                        actions={cameraMenu}
                                        rounded={true}
                                        class="bg-white rounded-2xl"
                                    />
                                </div>
                                <Tooltip triggeredBy="#camera_config_button"
                                    >Display-only camera and grid options</Tooltip
                                >
                            </section>
                        </div>
                        <div
                            class="mt-3 flex flex-wrap items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-sm"
                        >
                            <label for="m01-calibration-profile" class="font-medium">
                                M01 user-supplied calibration
                            </label>
                            <input
                                id="m01-calibration-profile"
                                type="file"
                                accept=".json,application/json"
                                aria-describedby="m01-calibration-profile-status"
                                on:change={loadM01ObservationProfile}
                            />
                            <Button
                                color="light"
                                size="xs"
                                aria-label="Clear calibration"
                                title="Clear calibration"
                                on:click={clearM01ObservationProfile}
                                disabled={m01ObservationGeometry === undefined}
                            >
                                <TrashBinOutline size="sm" aria-hidden="true" />
                            </Button>
                        </div>
                        <div
                            id="m01-calibration-profile-status"
                            class="mt-2 text-sm"
                            role={m01ProfileError ? 'alert' : 'status'}
                            aria-live="polite"
                        >
                            <p>{m01ProfileStatus}</p>
                            {#if m01ProfileFileName}<p class="mt-1">
                                    Scoring uses this calibration only; it is not an official field
                                    profile.
                                </p>{/if}
                            {#if m01ProfileError}<p class="mt-1 text-red-700">
                                    Profile error: {m01ProfileError}
                                </p>{/if}
                        </div>
                    </section>
                {/if}
                {#if workspaceMode !== 'practice'}
                    <div
                        class="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        role={projectRestoreError ? 'alert' : 'status'}
                        aria-live="polite"
                    >
                        <p>{projectRestoreStatus}</p>
                        {#if $projectDirtyStore.dirty}
                            <p class="mt-1 font-medium text-amber-800">
                                Unsaved changes. Save the project before loading another scene or
                                project.
                            </p>
                        {:else}
                            <p class="mt-1 text-slate-600">Project state saved.</p>
                        {/if}
                        {#if projectRestoreError}
                            <p class="mt-1 text-red-700">
                                Project setup warning: {projectRestoreError}
                            </p>
                        {/if}
                    </div>
                {/if}
            </div>
            {#key `${blocklyOpen}-${robotModelGeneration}`}
                <div class="min-h-0 min-w-0 flex-1 w-full overflow-hidden">
                    <SpikeSimulator
                        bind:runSimulation
                        {practiceReady}
                        {workspace}
                        bind:connectorOpen
                        bind:hub
                        bind:sceneOpen
                        bind:wheelsOpen
                        {camera}
                        {tilt}
                        {robotFocus}
                        {gridScale}
                        {m01ObservationGeometry}
                        {m01ObservationProfile}
                        bind:loadVirtualReferenceRobot
                        on:openDiagnostics={() => (workspaceMode = 'diagnostics')}
                    />
                </div>
            {/key}
        </div>
    </div>
    <UnsavedChangesModal
        open={seasonSelectionConfirmationOpen}
        actionLabel="switch seasons"
        on:cancel={cancelSeasonSelection}
        on:discard={continueSeasonSelection}
    />
{/if}
