<script lang="ts">
    import { Button, Modal } from 'flowbite-svelte';
    import FileSaver from 'file-saver';
    import {
        componentStore,
        clearPorts,
        setPort,
        setGearRatio,
        saveMPD
    } from '$lib/ldraw/components';
    import { allPorts, Hub } from '$lib/spike/vm';
    import { sceneStore } from '$lib/spike/scene';
    import JSZip from 'jszip';
    import { sceneObjectArchiveEntry } from '$lib/spike/scene-archive';
    import { ROBOT_ARCHIVE_ENTRY } from '$lib/spike/robot-archive';
    import {
        M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
        serializeM01ObservationProfileArchiveEntry
    } from '$lib/spike/m01-observation-profile-archive';
    import { serializeSceneDefinition } from '$lib/spike/scene-schema';
    import type { DroneSurveyObservationGeometryProfile } from '$lib/fll/drone-survey-observation-geometry-profile';

    export let modalOpen = false;
    export let hub: Hub;
    /** Optional M01 profile saved in the dedicated archive entry when supplied by the parent. */
    export let m01ObservationProfile: DroneSurveyObservationGeometryProfile | undefined = undefined;

    function saveRobot() {
        const robot = $componentStore.robotModel;
        if (robot) {
            clearPorts(robot);
            for (const port of allPorts) {
                const id = hub.ports[port].id();
                if (id !== 'none') {
                    setPort(robot, 'main', port, id);
                }
            }
            for (const wheel of hub.wheels) {
                setPort(robot, 'main', wheel.port, wheel.id);
                setGearRatio(robot, wheel.gearing, wheel.id);
            }
            const content = saveMPD(robot);
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            FileSaver.saveAs(blob, 'robot.mpd');
        }
    }

    async function saveScene() {
        const scene = $sceneStore;
        const zip = new JSZip();
        if (scene.map) {
            zip.file('mat.jpg', scene.map);
        }
        const json = serializeSceneDefinition(scene);
        const robot = $componentStore.robotModel;
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
</script>

<Modal
    backdropClass="fixed inset-0 z-[80] bg-gray-900 bg-opacity-50 dark:bg-opacity-80"
    dialogClass="fixed top-0 start-0 end-0 h-modal md:inset-0 md:h-full z-[90] w-full p-4 flex"
    title="Save simulation"
    bind:open={modalOpen}
>
    <div class="flex flex-col gap-2 items-center">
        <Button color="light" class="!p-2 w-96" on:click={saveRobot}>
            <div class="flex flex-row gap-2 items-center">
                <img alt="robot" width="32" height="32" src="icons/Robot.svg" />
                <span>Save robot (mpd with ports)</span>
            </div>
        </Button>
        <Button color="light" class="!p-2 w-96" on:click={saveScene}>
            <div class="flex flex-row gap-2 items-center">
                <img alt="scene" width="32" height="32" src="icons/Scene.svg" />
                <span>Save scene with mat (zip with mpd)</span>
            </div>
        </Button>
    </div>
</Modal>
