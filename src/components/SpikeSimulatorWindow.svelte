<script lang="ts">
    import * as Blockly from 'blockly/core';
    import { CogOutline } from 'flowbite-svelte-icons';
    import { Button, CloseButton, Tooltip } from 'flowbite-svelte';
    import MenuDropdown from '$components/MenuDropdown.svelte';
    import { type MenuAction } from '$components/Menu.svelte';
    import HubIcon from '$components/HubIcon.svelte';
    import BioglowMissionReadiness from '$components/BioglowMissionReadiness.svelte';
    import SpikeSimulator from '$components/SpikeSimulator.svelte';
    import SaveSimulation from '$components/SaveSimulation.svelte';
    import SimulatorSettings from '$components/SimulatorSettings.svelte';
    import PortConnector from '$components/PortConnector.svelte';
    import WheelConnector from '$components/WheelConnector.svelte';
    import LoadScene from '$components/LoadScene.svelte';
    import type { DroneSurveyObservationGeometry } from '$lib/fll/drone-survey-observations';
    import {
        parseDroneSurveyObservationGeometryProfile,
        type DroneSurveyObservationGeometryProfile
    } from '$lib/fll/drone-survey-observation-geometry-profile';
    import { type LDrawStore, componentStore } from '$lib/ldraw/components';
    import { Hub, codeStore } from '$lib/spike/vm';
    import {
        spikeGenerator,
        resetCode,
        getCodeEvents,
        getCodeProcedures
    } from '$lib/blockly/generator';

    export let modalOpen = false;
    export let blocklyOpen: boolean;
    export let workspace: Blockly.WorkspaceSvg | undefined;
    export let split = 2;
    let hub = new Hub();

    let connectorOpen = false;
    let wheelsOpen = false;
    let saveOpen = false;
    let sceneOpen = false;
    let settingsOpen = false;
    let robotButtonColour: 'light' | 'red' | 'green' = 'light';
    let libraryClass = '!p-2';
    let runSimulation = false;
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
        const element = document.getElementById('load_robot');
        if (element) {
            element.click();
        }
    }

    function askForLibrary() {
        const element = document.getElementById('load_library');
        if (element) {
            element.click();
        }
    }

    function updateButtons(store: LDrawStore) {
        if (!store.robotModel) {
            robotButtonColour = 'light';
        } else {
            if (store.unresolved.length > 0) {
                robotButtonColour = 'red';
            } else {
                robotButtonColour = 'green';
            }
        }
        if (store.unresolved.length > 0) {
            libraryClass = '!p-2 animate-bounce';
        } else {
            libraryClass = '!p-2';
        }
    }

    function startRobot() {
        resetCode();
        const code = spikeGenerator.workspaceToCode(workspace);
        console.log('=======');
        console.log(code);
        console.log('=======');
        console.log(getCodeProcedures());
        codeStore.set({ events: getCodeEvents(), procedures: getCodeProcedures() });
        runSimulation = true;
    }

    function stopRobot() {
        runSimulation = false;
    }

    function saveRobotOrScene() {
        saveOpen = true;
    }

    function connectPorts() {
        connectorOpen = true;
    }

    function connectWheels() {
        wheelsOpen = true;
    }

    function loadScene() {
        sceneOpen = true;
    }

    function openSettings() {
        settingsOpen = true;
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
        } catch (error) {
            if (loadGeneration !== m01ProfileLoadGeneration) return;
            m01ProfileError =
                error instanceof Error
                    ? error.message
                    : 'The calibration profile could not be read.';
            m01ProfileStatus =
                'M01 scoring is disabled because the selected calibration profile is invalid.';
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

    $: updateButtons($componentStore);
</script>

<PortConnector bind:modalOpen={connectorOpen} bind:hub />
<WheelConnector bind:modalOpen={wheelsOpen} bind:hub />
<SaveSimulation bind:modalOpen={saveOpen} bind:hub {m01ObservationProfile} />
<LoadScene
    bind:modalOpen={sceneOpen}
    onM01ObservationProfileLoaded={applyM01ObservationProfile}
    onRobotModelLoaded={handleRobotModelLoaded}
/>
<SimulatorSettings bind:modalOpen={settingsOpen} />
{#if modalOpen}
    <div class="{split == 1 ? 'flex-1' : 'flex-[2]'} h-full overflow-hidden">
        <div class="relative flex-1 h-full flex flex-col overflow-hidden">
            <div
                class="flex flex-row bg-gray-100 gap-2 p-2 items-center border-b border-b-gray-300 z-10 flex-wrap"
            >
                <div class="w-8 h-8 flex flex-col justify-center items-center">
                    <img alt="code" width="32" height="32" src="icons/Brick.svg" />
                </div>
                <Button color={robotButtonColour} class="!p-2" on:click={askForRobot}>
                    <div class="w-8 h-8 flex flex-col justify-center items-center">
                        <img alt="robot" width="32" height="32" src="icons/Robot.svg" />
                    </div>
                </Button>
                <Tooltip>Load a robot model for use in the simulator</Tooltip>
                <Button
                    color="light"
                    class="!px-3 !py-2 text-xs"
                    on:click={() => (loadVirtualReferenceRobot = true)}
                >
                    Reference robot
                </Button>
                <Tooltip>Load the BIOGLOW virtual reference robot design target</Tooltip>
                <Button color="light" class="!p-2" on:click={connectPorts}>
                    <div class="w-8 h-8 flex flex-col justify-center items-center">
                        <HubIcon />
                    </div>
                </Button>
                <Tooltip>Connect ports on the spike hub of the robot</Tooltip>
                <Button color="light" class="!p-2" on:click={connectWheels}>
                    <div class="w-8 h-8 flex flex-col justify-center items-center">
                        <img alt="scene" width="32" height="32" src="icons/wheel.svg" />
                    </div>
                </Button>
                <Tooltip>Connect wheels to motors of the robot</Tooltip>
                <Button color="light" class="!p-2" on:click={loadScene}>
                    <div class="w-8 h-8 flex flex-col justify-center items-center">
                        <img alt="scene" width="32" height="32" src="icons/Scene.svg" />
                    </div>
                </Button>
                <Tooltip>Setup or load a scene based on a WRO or FLL mat</Tooltip>
                <Button color="light" class={libraryClass} on:click={askForLibrary}>
                    <div class="w-8 h-8 flex flex-col justify-center items-center">
                        <img alt="scene" width="32" height="32" src="icons/Library.svg" />
                    </div>
                </Button>
                <Tooltip>Load any missing components from the ldraw library (complete.zip)</Tooltip>
                <Button color="light" class="!p-2" on:click={saveRobotOrScene}>
                    <div class="w-8 h-8 flex flex-col justify-center items-center">
                        <img alt="save" width="32" height="32" src="icons/SaveMedium.svg" />
                    </div>
                </Button>
                <Tooltip
                    >Save the robot with ports and wheels, or the complete scene archive</Tooltip
                >
                <Button color="light" class="!p-2" on:click={openSettings}>
                    <CogOutline class="w-8 h-8" />
                </Button>
                <Tooltip>Adjust simulator speed settings</Tooltip>
                <Button id="camera_config_button" color="light" class="!p-2">
                    <div class="w-8 h-8 flex flex-col justify-center items-center">
                        <img alt="eye" width="32" height="32" src="icons/Eye.svg" />
                    </div>
                </Button>
                <MenuDropdown
                    name="camera"
                    actions={cameraMenu}
                    rounded={true}
                    class="bg-white rounded-2xl"
                />
                <Tooltip triggeredBy="#camera_config_button">Set camera for simulator</Tooltip>
                <div
                    class="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-sm"
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
                        on:click={clearM01ObservationProfile}
                        disabled={m01ObservationGeometry === undefined}
                    >
                        Clear calibration
                    </Button>
                </div>
                {#if runSimulation}
                    <Button color="light" class="!p-2" on:click={stopRobot}>
                        <div class="w-8 h-8 flex flex-col justify-center items-center">
                            <img
                                alt="stop"
                                width="32"
                                height="32"
                                src="icons/GenericStopIcon.svg"
                            />
                        </div>
                    </Button>
                    <Tooltip>Stop the simulation</Tooltip>
                {:else}
                    <Button color="light" class="!p-2" on:click={startRobot}>
                        <div class="w-8 h-8 flex flex-col justify-center items-center">
                            <img
                                alt="play"
                                width="32"
                                height="32"
                                src="icons/GenericPlayIcon.svg"
                            />
                        </div>
                    </Button>
                    <Tooltip>Start the simulation, running the code in the code panel</Tooltip>
                {/if}
                {#if !blocklyOpen}
                    <Button color="light" class="!p-2" on:click={openBlockly}>
                        <div class="w-8 h-8 flex flex-col justify-center items-center">
                            <img alt="blockly" width="32" height="32" src="icons/BlocklyIcon.svg" />
                        </div>
                    </Button>
                    <Tooltip>Open the code panel</Tooltip>
                {/if}
                <div class="flex-1" />
                {#if blocklyOpen}
                    <CloseButton on:click={closeWindow} />
                    <Tooltip>Close the simulation window</Tooltip>
                {/if}
            </div>
            <div
                id="m01-calibration-profile-status"
                class="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                role={m01ProfileError ? 'alert' : 'status'}
                aria-live="polite"
            >
                <p>{m01ProfileStatus}</p>
                {#if m01ProfileFileName}
                    <p class="mt-1">
                        Scoring uses this calibration only; it is not an official field profile.
                    </p>
                {/if}
                {#if m01ProfileError}
                    <p class="mt-1 text-red-700">Profile error: {m01ProfileError}</p>
                {/if}
            </div>
            <BioglowMissionReadiness />
            {#key `${blocklyOpen}-${robotModelGeneration}`}
                <div class="flex-1 w-full overflow-hidden">
                    <SpikeSimulator
                        bind:runSimulation
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
                    />
                </div>
            {/key}
        </div>
    </div>
{/if}
