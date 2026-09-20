<script lang="ts">
    import * as Blockly from 'blockly/core';
    import { Button, Modal } from 'flowbite-svelte';
    import FileSaver from 'file-saver';
    import {
        componentStore,
        clearPorts,
        setPort,
        setGearRatio,
        saveMPD
    } from '$lib/ldraw/components';
    import { allPorts, getStartDelay, getStepSleep, getTimeFactor, Hub } from '$lib/spike/vm';
    import { boundaryStore, sceneStore } from '$lib/spike/scene';
    import JSZip from 'jszip';
    import { sceneObjectArchiveEntry } from '$lib/spike/scene-archive';
    import { ROBOT_ARCHIVE_ENTRY } from '$lib/spike/robot-archive';
    import {
        M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
        serializeM01ObservationProfileArchiveEntry
    } from '$lib/spike/m01-observation-profile-archive';
    import { serializeSceneDefinition } from '$lib/spike/scene-schema';
    import type { DroneSurveyObservationGeometryProfile } from '$lib/fll/drone-survey-observation-geometry-profile';
    import type { BlocklyState } from '$lib/blockly/state';
    import type { SeasonPackage } from '$lib/fll/season-package';
    import {
        createProjectEnvelope,
        PROJECT_ARCHIVE_ENTRY,
        projectRevision,
        serializeProjectEnvelope,
        seasonReferenceFromPackage
    } from '$lib/spike/project-contract';

    export let modalOpen = false;
    export let hub: Hub;
    /** Optional M01 profile saved in the dedicated archive entry when supplied by the parent. */
    export let m01ObservationProfile: DroneSurveyObservationGeometryProfile | undefined = undefined;
    export let workspace: Blockly.WorkspaceSvg | undefined = undefined;
    export let seasonPackage: SeasonPackage | undefined = undefined;
    export let onProjectSaved: ((revision: string) => void) | undefined = undefined;

    function syncRobotConnections(robot: NonNullable<typeof $componentStore.robotModel>): void {
        clearPorts(robot);
        for (const port of allPorts) {
            const id = hub.ports[port].id();
            if (id !== 'none') setPort(robot, 'main', port, id);
        }
        for (const wheel of hub.wheels) {
            setPort(robot, 'main', wheel.port, wheel.id);
            setGearRatio(robot, wheel.gearing, wheel.id);
        }
    }

    function saveRobot() {
        const robot = $componentStore.robotModel;
        if (robot) {
            syncRobotConnections(robot);
            const content = saveMPD(robot);
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            FileSaver.saveAs(blob, 'robot.mpd');
        }
    }

    async function saveScene() {
        const scene = $sceneStore;
        const zip = new JSZip();
        const robot = $componentStore.robotModel;
        if (robot) syncRobotConnections(robot);
        if (scene.map) {
            zip.file('mat.jpg', scene.map);
        }
        const json = serializeSceneDefinition(scene);
        if (robot) {
            zip.file(ROBOT_ARCHIVE_ENTRY, saveMPD(robot));
        }
        for (const [index, obj] of scene.objects.entries()) {
            if (obj.bricks) {
                const content = saveMPD(obj.bricks);
                zip.file(sceneObjectArchiveEntry(json.objects[index].id), content);
            }
        }
        if (m01ObservationProfile) {
            zip.file(
                M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
                serializeM01ObservationProfileArchiveEntry(m01ObservationProfile)
            );
        }
        zip.file('scene.json', JSON.stringify(json));
        const sceneZip = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        FileSaver.saveAs(sceneZip, 'scene.spk');
    }

    async function saveProject() {
        const scene = $sceneStore;
        const zip = new JSZip();
        const robot = $componentStore.robotModel;
        if (robot) syncRobotConnections(robot);
        const json = serializeSceneDefinition(scene);
        const robotSetup = {
            archiveEntry: ROBOT_ARCHIVE_ENTRY,
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
        };
        const program = workspace
            ? (Blockly.serialization.workspaces.save(workspace) as BlocklyState)
            : undefined;
        const envelope = createProjectEnvelope({
            scene: json,
            robotSetup,
            program,
            seasonReference: seasonPackage ? seasonReferenceFromPackage(seasonPackage) : undefined,
            participantSettings: {
                simulation: {
                    stepTimeMs: getStepSleep(),
                    startDelayMs: getStartDelay(),
                    timeScale: getTimeFactor(),
                    encoderMode:
                        scene.physicsWorld?.encoderMode === 'physical' ? 'physical' : 'command'
                },
                display: {
                    boundaryScale: $boundaryStore.scale,
                    drawBoundary: $boundaryStore.draw,
                    showBoundaryCollisions: $boundaryStore.collisions,
                    showPhysicsDebug: $boundaryStore.debugPhysics
                }
            },
            modelEntries: json.objects.map((object) => sceneObjectArchiveEntry(object.id)),
            hasMap: scene.map !== undefined
        });
        if (scene.map) zip.file('mat.jpg', scene.map);
        if (robot) zip.file(ROBOT_ARCHIVE_ENTRY, saveMPD(robot));
        for (const [index, object] of scene.objects.entries()) {
            if (object.bricks) {
                zip.file(sceneObjectArchiveEntry(json.objects[index].id), saveMPD(object.bricks));
            }
        }
        if (m01ObservationProfile) {
            zip.file(
                M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
                serializeM01ObservationProfileArchiveEntry(m01ObservationProfile)
            );
        }
        zip.file('scene.json', JSON.stringify(json));
        zip.file(PROJECT_ARCHIVE_ENTRY, serializeProjectEnvelope(envelope));
        const projectZip = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        FileSaver.saveAs(projectZip, 'project.lsp-project');
        onProjectSaved?.(projectRevision(envelope));
    }
</script>

<Modal
    backdropClass="fixed inset-0 z-[80] bg-gray-900 bg-opacity-50 dark:bg-opacity-80"
    dialogClass="fixed top-0 start-0 end-0 h-modal md:inset-0 md:h-full z-[90] w-full p-4 flex"
    title="Save project or export setup"
    bind:open={modalOpen}
>
    <div class="flex flex-col gap-2 items-center">
        <p class="w-96 text-sm text-slate-700">
            Save project keeps the field, robot setup, program, season selection, and supported
            settings together. Robot and scene exports are separate setup files.
        </p>
        <Button color="light" class="!p-2 w-96" on:click={saveRobot}>
            <div class="flex flex-row gap-2 items-center">
                <img alt="robot" width="32" height="32" src="icons/Robot.svg" />
                <span>Export robot setup (.mpd, including ports)</span>
            </div>
        </Button>
        <Button color="light" class="!p-2 w-96" on:click={saveScene}>
            <div class="flex flex-row gap-2 items-center">
                <img alt="scene" width="32" height="32" src="icons/Scene.svg" />
                <span>Export legacy scene setup (.spk, including mat)</span>
            </div>
        </Button>
        <Button color="green" class="!p-2 w-96" on:click={saveProject}>
            <div class="flex flex-row gap-2 items-center">
                <img alt="project" width="32" height="32" src="icons/SaveMedium.svg" />
                <span>Save project (.lsp-project)</span>
            </div>
        </Button>
    </div>
</Modal>
