<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { Button, Input, Modal } from 'flowbite-svelte';
    import {
        type Model,
        loadModel,
        setStudioMode,
        componentStore,
        updateUnresolvedParts
    } from '$lib/ldraw/components';
    import { sceneStore, type SceneStore, type SceneObject } from '$lib/spike/scene';
    import { EditOutline, TrashBinOutline } from 'flowbite-svelte-icons';
    import ScenePreview from '$components/ScenePreview.svelte';
    import ObjectPhysicsEditor from '$components/ObjectPhysicsEditor.svelte';
    import Menu from '$components/Menu.svelte';
    import { type MenuAction, type MenuEntry } from '$components/Menu.svelte';
    import JSZip from 'jszip';
    import {
        legacySceneObjectArchiveEntry,
        sceneObjectArchiveEntry
    } from '$lib/spike/scene-archive';
    import { parseSceneDefinition } from '$lib/spike/scene-schema';
    import { WebGLCompiler } from '$lib/ldraw/gl';
    import {
        createModelPhysicsArticulation,
        findBundledModelPhysics,
        parseModelPhysicsSidecar
    } from '$lib/physics/articulation-presets';

    export let modalOpen = false;
    let numberOfLoads = 0;
    let mapFile: Blob | undefined = $sceneStore.map;
    let camera: 'top' | 'left' | 'right' | 'front' | 'back' = 'front';
    let tilt = true;
    let rotate = false;
    let select: string | undefined = '#all';
    let selectedText: string | undefined;
    let selectedObject: SceneObject | undefined;
    let renameObject: SceneObject | undefined = undefined;
    let newName: string = '';
    let customSizeVisible = false;
    let customHeight = 1000;
    let customWidth = 1000;

    let menu = prepareMenu(rotate, tilt, camera, select, $sceneStore);
    $: menu = prepareMenu(rotate, tilt, camera, select, $sceneStore);
    $: setRobotModel($componentStore.robotModel);
    $: updateObjectsFromLibrary($componentStore.unresolved);

    function editorKey(object: SceneObject): string {
        return object.editorGroup ?? object.name;
    }

    function editorLabel(object: SceneObject): string {
        return object.editorName ?? object.name;
    }

    function editorObjects(scene: SceneStore): SceneObject[] {
        const seen = new Set<string>();
        return scene.objects.filter((object) => {
            const key = editorKey(object);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function selectedObjects(): SceneObject[] {
        if (!select || select.startsWith('#')) return selectedObject ? [selectedObject] : [];
        return $sceneStore.objects.filter((object) => editorKey(object) === select);
    }

    function uniqueObjectId(scene: SceneStore, name: string): string {
        const base =
            name
                .toLowerCase()
                .replace(/\.[^.]+$/, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'object';
        const used = new Set(scene.objects.map((object) => object.id));
        let id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        return id;
    }

    function toggleRotate() {
        rotate = !rotate;
    }

    function toggleTilt() {
        tilt = !tilt;
    }

    function setCamera(direction: 'top' | 'left' | 'right' | 'front' | 'back') {
        camera = direction;
    }

    function setRobotModel(robot: Model | undefined) {
        sceneStore.update((old) => {
            const newRobot = { ...old.robot, bricks: robot, compiled: undefined };
            return {
                ...old,
                robot: newRobot
            };
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function updateObjectsFromLibrary(unresolved: string[]) {
        sceneStore.update((old) => {
            const objects = Array.from(old.objects);
            return {
                ...old,
                objects: objects
            };
        });
    }

    function removeObject(key: string) {
        if (key === select) {
            select = undefined;
            selectedText = undefined;
            selectedObject = undefined;
        }
        sceneStore.update((old) => {
            const objects = old.objects.filter((object) => editorKey(object) !== key);
            const removedIds = new Set(
                old.objects.filter((object) => editorKey(object) === key).map((object) => object.id)
            );
            return {
                ...old,
                objects: objects,
                joints: old.joints?.filter(
                    (joint) => !removedIds.has(joint.childId) && !removedIds.has(joint.parentId)
                )
            };
        });
    }

    function setSelected(key: string) {
        select = key;
        if (key.startsWith('#')) {
            if (key == '#map') {
                selectedText = `Mat (${$sceneStore.mapWidth}mm x ${$sceneStore.mapHeight}mm)`;
                selectedObject = undefined;
            } else if (key == '#robot') {
                selectedText = 'Spike robot';
                selectedObject = $sceneStore.robot;
            } else if (key == '#all') {
                selectedText = '';
                selectedObject = undefined;
            } else {
                selectedText = undefined;
                selectedObject = undefined;
            }
        } else {
            selectedObject = $sceneStore.objects.find((object) => editorKey(object) === key);
            selectedText = selectedObject ? `Object: ${editorLabel(selectedObject)}` : undefined;
        }
    }

    function updateSelectedText(scene: SceneStore) {
        if (select == '#map') {
            selectedText = `Mat (${scene.mapWidth}mm x ${scene.mapHeight}mm)`;
        }
    }

    function setFirstLegoLeagueMatSize() {
        sceneStore.update((old) => {
            return {
                ...old,
                mapWidth: 2360,
                mapHeight: 1140
            };
        });
    }

    function setWorldRoboticsOrganizationMatSize() {
        sceneStore.update((old) => {
            return {
                ...old,
                mapWidth: 2362,
                mapHeight: 1143
            };
        });
    }

    function setCustomMapSize() {
        customWidth = $sceneStore.mapWidth;
        customHeight = $sceneStore.mapHeight;
        renameObject = undefined;
        customSizeVisible = true;
    }

    function setRenameObject(obj: SceneObject) {
        customSizeVisible = false;
        renameObject = obj;
        newName = obj.name;
    }

    function hideRename() {
        renameObject = undefined;
    }

    function doRenameObject() {
        if (renameObject) {
            const oldKey = editorKey(renameObject);
            if (renameObject.editorGroup) {
                for (const object of $sceneStore.objects) {
                    if (object.editorGroup === renameObject.editorGroup)
                        object.editorName = newName;
                }
            } else {
                renameObject.name = newName;
            }
            renameObject = undefined;
            menu = prepareMenu(rotate, tilt, camera, select, $sceneStore);
            if (select == oldKey) {
                selectedText = `Object: ${newName}`;
            }
        }
    }

    function hideCustomSize() {
        customSizeVisible = false;
    }

    function setCustomSize() {
        customSizeVisible = false;
        customWidth = +customWidth;
        customHeight = +customHeight;
        if (customWidth < 200) {
            customWidth = 200;
        }
        if (customHeight < 200) {
            customHeight = 200;
        }
        sceneStore.update((old) => {
            return {
                ...old,
                mapWidth: +customWidth,
                mapHeight: +customHeight
            };
        });
    }

    function loadLibrary() {
        const element = document.getElementById('load_library');
        if (element) {
            element.click();
        }
    }

    function prepareMenu(
        rotate: boolean,
        tilt: boolean,
        camera: string,
        select: string | undefined,
        scene: SceneStore
    ) {
        let menu: MenuEntry[] = [];
        menu.push({
            name: 'Mat Size',
            actions: [
                { name: 'FLL (2360mm x 1140mm)', action: () => setFirstLegoLeagueMatSize() },
                {
                    name: 'WRO (2362mm x 1143mm)',
                    action: () => setWorldRoboticsOrganizationMatSize()
                },
                { name: 'Custom', action: () => setCustomMapSize() }
            ]
        });
        menu.push({
            name: 'Load',
            actions: [
                { name: 'Load mat', action: () => loadBackgroundMap() },
                { name: 'Load object', action: () => loadObject() },
                { name: 'Load full scene', action: () => loadScene() },
                { name: 'Load missing parts', action: () => loadLibrary() }
            ]
        });
        menu.push({
            name: 'Camera',
            actions: [
                {
                    name: 'Top',
                    action: () => {
                        setCamera('top');
                    },
                    radio: camera == 'top'
                },
                {
                    name: 'Left',
                    action: () => {
                        setCamera('left');
                    },
                    radio: camera == 'left'
                },
                {
                    name: 'Right',
                    action: () => {
                        setCamera('right');
                    },
                    radio: camera == 'right'
                },
                {
                    name: 'Front',
                    action: () => {
                        setCamera('front');
                    },
                    radio: camera == 'front'
                },
                {
                    name: 'Back',
                    action: () => {
                        setCamera('back');
                    },
                    radio: camera == 'back'
                },
                {
                    name: 'Rotate',
                    action: () => {
                        toggleRotate();
                    },
                    checkbox: rotate
                },
                {
                    name: 'Tilt',
                    action: () => {
                        toggleTilt();
                    },
                    checkbox: tilt
                }
            ]
        });

        let selectMenu: MenuAction[] = [];
        if (scene.map) {
            selectMenu.push({
                name: 'All',
                action: () => {
                    setSelected('#all');
                },
                radio: select == '#all'
            });
            selectMenu.push({
                name: 'Mat',
                action: () => {
                    setSelected('#map');
                },
                radio: select == '#map'
            });
        }
        selectMenu.push({
            name: 'Robot',
            action: () => {
                setSelected('#robot');
            },
            radio: select == '#robot'
        });
        for (const obj of editorObjects(scene)) {
            const key = editorKey(obj);
            selectMenu.push({
                name: editorLabel(obj),
                action: () => {
                    setSelected(key);
                },
                radio: select == key
            });
        }
        menu.push({
            name: 'Select',
            actions: selectMenu
        });

        let remove: MenuAction[] = [];
        for (const obj of editorObjects(scene)) {
            const key = editorKey(obj);
            remove.push({
                name: editorLabel(obj),
                action: () => {
                    removeObject(key);
                },
                icon: TrashBinOutline
            });
        }
        menu.push({
            name: 'Remove',
            actions: remove
        });

        let rename: MenuAction[] = [];
        for (const obj of editorObjects(scene)) {
            rename.push({
                name: editorLabel(obj),
                action: () => {
                    setRenameObject(obj);
                },
                icon: EditOutline
            });
        }
        menu.push({
            name: 'Rename',
            actions: rename
        });
        return menu;
    }

    function loadBackgroundMap() {
        const element = document.getElementById('load_map_image');
        if (element) {
            element.click();
        }
    }

    function loadScene() {
        const element = document.getElementById('load_scene_file');
        if (element) {
            element.click();
        }
    }

    function loadObject() {
        const element = document.getElementById('load_object_file');
        if (element) {
            element.click();
        }
    }

    function loadMapImage() {
        const element = document.getElementById('load_map_image');
        if (element) {
            const fileElement = element as HTMLInputElement;
            if (fileElement.files) {
                if (fileElement.files.length > 0) {
                    const first = fileElement.files[0];
                    mapFile = first;
                    sceneStore.update((old) => {
                        return {
                            ...old,
                            map: mapFile
                        };
                    });
                    setSelected('#map');
                    numberOfLoads++;
                }
            }
        }
    }

    async function loadSceneFromFile() {
        const element = document.getElementById('load_scene_file');
        if (element) {
            const fileElement = element as HTMLInputElement;
            if (fileElement.files && fileElement.files.length > 0) {
                const first = fileElement.files[0];
                const zip = new JSZip();
                const zipFile = await zip.loadAsync(first);
                let map: Blob | undefined = undefined;
                const jsonFile = zipFile.file('scene.json');
                if (!jsonFile) {
                    console.log('Invalid scene file format, missing scene.json');
                    return;
                }
                const sceneDefContents = await jsonFile.async('string');
                const scene = parseSceneDefinition(JSON.parse(sceneDefContents));
                const objects: SceneObject[] = [];

                const mapFile = zipFile.file('mat.jpg');
                if (mapFile) {
                    map = await mapFile.async('blob');
                }

                const robot = {
                    id: scene.robot.id,
                    anchored: scene.robot.anchored,
                    position: scene.robot.position,
                    rotation: scene.robot.rotation,
                    name: scene.robot.name,
                    bricks: $componentStore.robotModel,
                    physics: scene.robot.physics,
                    drive: scene.robot.drive,
                    hinge: scene.robot.hinge,
                    rotationQuaternion: scene.robot.rotationQuaternion,
                    preserveOrigin: scene.robot.preserveOrigin
                };
                for (const obj of scene.objects) {
                    const stableObjectFile = obj.id
                        ? zipFile.file(sceneObjectArchiveEntry(obj.id))
                        : null;
                    const objFile =
                        stableObjectFile ?? zipFile.file(legacySceneObjectArchiveEntry(obj.name));
                    if (objFile) {
                        const content = await objFile.async('string');
                        const model = loadModel(obj.name, content);
                        updateUnresolvedParts();
                        objects.push({
                            id: obj.id,
                            anchored: obj.anchored,
                            position: obj.position,
                            rotation: obj.rotation,
                            name: obj.name,
                            bricks: model,
                            physics: obj.physics,
                            hinge: obj.hinge,
                            rotationQuaternion: obj.rotationQuaternion,
                            preserveOrigin: obj.preserveOrigin,
                            editorGroup: obj.editorGroup,
                            editorName: obj.editorName
                        });
                    } else {
                        objects.push({
                            id: obj.id,
                            anchored: obj.anchored,
                            position: obj.position,
                            rotation: obj.rotation,
                            name: obj.name,
                            physics: obj.physics,
                            hinge: obj.hinge,
                            rotationQuaternion: obj.rotationQuaternion,
                            preserveOrigin: obj.preserveOrigin,
                            editorGroup: obj.editorGroup,
                            editorName: obj.editorName
                        });
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                sceneStore.update((old) => {
                    return {
                        robot: robot,
                        objects: objects,
                        map: map,
                        mapWidth: scene.mapWidth,
                        mapHeight: scene.mapHeight,
                        physicsWorld: scene.physicsWorld,
                        joints: scene.joints
                    };
                });
            }
        }
    }

    async function loadObjectFromFile() {
        const element = document.getElementById('load_object_file');
        if (element) {
            const fileElement = element as HTMLInputElement;
            if (fileElement.files) {
                if (fileElement.files.length > 0) {
                    const files = Array.from(fileElement.files);
                    const first = files.find((file) => !file.name.endsWith('.physics.json'));
                    if (!first) return;
                    if (first.name.toLowerCase().endsWith('.io')) {
                        const zip = new JSZip();
                        const zipFile = await zip.loadAsync(first);
                        const file = zipFile.file('model2.ldr');
                        if (file) {
                            const content = await file.async('string');
                            try {
                                setStudioMode(true);
                                const model = loadModel(first.name, content);
                                updateUnresolvedParts();
                                sceneStore.update((old) => {
                                    return {
                                        ...old,
                                        objects: old.objects.concat([
                                            {
                                                id: uniqueObjectId(old, first.name),
                                                bricks: model,
                                                anchored: true,
                                                name: first.name
                                            }
                                        ])
                                    };
                                });
                                setSelected(first.name);
                            } finally {
                                setStudioMode(false);
                            }
                        }
                    } else {
                        const model = loadModel(first.name, await first.text());
                        updateUnresolvedParts();
                        const sidecarName = first.name.replace(/\.[^.]+$/, '.physics.json');
                        const sidecarFile = files.find(
                            (file) => file.name.toLowerCase() === sidecarName.toLowerCase()
                        );
                        const sidecar = sidecarFile
                            ? parseModelPhysicsSidecar(JSON.parse(await sidecarFile.text()))
                            : findBundledModelPhysics(first.name);
                        if (sidecar && sidecar.model.toLowerCase() !== first.name.toLowerCase()) {
                            throw new Error(
                                `Physics sidecar targets ${sidecar.model}, not ${first.name}`
                            );
                        }
                        if (sidecar) {
                            const compiled = new WebGLCompiler().compileModel(model, {
                                rescale: false,
                                recenter: false
                            });
                            const initialY = Number.isFinite(compiled.bbox.min.y)
                                ? -compiled.bbox.min.y
                                : 0;
                            const preset = createModelPhysicsArticulation(
                                model,
                                { x: 0, y: initialY, z: 0 },
                                sidecar
                            );
                            sceneStore.update((old) => ({
                                ...old,
                                objects: old.objects.concat(preset.objects),
                                joints: [...(old.joints ?? []), ...preset.joints]
                            }));
                            const editable = preset.objects.find((object) => !object.anchored);
                            setSelected(editable ? editorKey(editable) : first.name);
                        } else {
                            sceneStore.update((old) => {
                                return {
                                    ...old,
                                    objects: old.objects.concat([
                                        {
                                            id: uniqueObjectId(old, first.name),
                                            bricks: model,
                                            anchored: true,
                                            name: first.name
                                        }
                                    ])
                                };
                            });
                            setSelected(first.name);
                        }
                    }
                    numberOfLoads++;
                }
            }
        }
    }

    function moveObjectLeft() {
        if (!modalOpen) {
            return;
        }
        if (!selectedObject) {
            return;
        }
        for (const object of selectedObjects()) if (object.position) object.position.x -= 10.0;
    }

    function moveObjectRight() {
        if (!modalOpen) {
            return;
        }
        if (!selectedObject) {
            return;
        }
        for (const object of selectedObjects()) if (object.position) object.position.x += 10.0;
    }

    function moveObjectUp() {
        if (!modalOpen) {
            return;
        }
        if (!selectedObject) {
            return;
        }
        for (const object of selectedObjects()) if (object.position) object.position.z -= 10.0;
    }

    function moveObjectDown() {
        if (!modalOpen) {
            return;
        }
        if (!selectedObject) {
            return;
        }
        for (const object of selectedObjects()) if (object.position) object.position.z += 10.0;
    }

    function rotateObjectClockwise() {
        if (!modalOpen) {
            return;
        }
        if (!selectedObject) {
            return;
        }
        for (const object of selectedObjects()) {
            object.rotation = (object.rotation ?? 0) - 10.0;
            object.rotationQuaternion = undefined;
        }
    }

    function rotateObjectAntiClockwise() {
        if (!modalOpen) {
            return;
        }
        if (!selectedObject) {
            return;
        }
        for (const object of selectedObjects()) {
            object.rotation = (object.rotation ?? 0) + 10.0;
            object.rotationQuaternion = undefined;
        }
    }

    function updateObjectPhysics(
        event: CustomEvent<{ joints: NonNullable<SceneStore['joints']> }>
    ) {
        sceneStore.update((scene) => ({
            ...scene,
            objects: [...scene.objects],
            joints: event.detail.joints
        }));
    }

    function moveObjectWithKey(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
            moveObjectDown();
        } else if (event.key === 'ArrowUp') {
            moveObjectUp();
        } else if (event.key === 'ArrowLeft') {
            moveObjectLeft();
        } else if (event.key === 'ArrowRight') {
            moveObjectRight();
        } else if (event.key === 'r') {
            rotateObjectClockwise();
        } else if (event.key === 'R') {
            rotateObjectAntiClockwise();
        }
    }

    onMount(() => {
        window.addEventListener('keyup', moveObjectWithKey);
    });

    onDestroy(() => {
        window.removeEventListener('keyup', moveObjectWithKey);
    });

    $: updateSelectedText($sceneStore);
</script>

{#key numberOfLoads}
    <input
        type="file"
        id="load_map_image"
        class="hidden"
        accept=".jpg,.png"
        on:change={loadMapImage}
    />
    <input
        type="file"
        id="load_object_file"
        class="hidden"
        accept=".ldr,.mpd,.io,.json"
        multiple
        on:change={loadObjectFromFile}
    />
    <input
        type="file"
        id="load_scene_file"
        class="hidden"
        accept=".spk"
        on:change={loadSceneFromFile}
    />
{/key}
<Modal
    backdropClass="fixed inset-0 z-[80] bg-gray-900 bg-opacity-50 dark:bg-opacity-80"
    dialogClass="fixed top-0 start-0 end-0 h-modal md:inset-0 md:h-full z-[90] w-full p-4 flex"
    title="Scene editor"
    size="xl"
    bind:open={modalOpen}
>
    <div class="flex flex-col gap-1 h-[75dvh] relative overflow-hidden">
        <Menu {menu} class="absolute z-50" />
        <div class="flex flex-row flex-1 relative overflow-hidden">
            <div class="flex-1 h-full relative">
                {#if selectedText && $componentStore.unresolved.length == 0}
                    <div class="absolute right-0 top-0 text-white mx-2 my-1">{selectedText}</div>
                {/if}
                {#if $componentStore.unresolved.length > 0}
                    <div class="absolute right-0 top-0 text-red-600 bg-white px-2 mx-2 my-1">
                        Missing parts: {$componentStore.unresolved.length}
                    </div>
                {/if}
                <div class="absolute left-0 top-0 h-full w-full" hidden={!renameObject}>
                    {#if renameObject}
                        <div class="flex flex-row justify-around items-center h-full">
                            <div class="bg-white rounded-xl p-3 flex flex-col shadow gap-2">
                                <h2>Rename object: {renameObject.name}</h2>
                                <hr />
                                <div class="flex flex-row w-96 gap-2 items-center">
                                    <span class="w-28">New name: </span><Input
                                        bind:value={newName}
                                    />
                                </div>
                                <div class="flex flex-row justify-center gap-2">
                                    <Button on:click={hideRename}>CANCEL</Button>
                                    <Button on:click={doRenameObject} color="green">OK</Button>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
                <div class="absolute left-0 top-0 h-full w-full" hidden={!customSizeVisible}>
                    <div class="flex flex-row justify-around items-center h-full">
                        <div class="bg-white rounded-xl p-3 flex flex-col shadow gap-2">
                            <h2>Custom Mat Size</h2>
                            <hr />
                            <div class="flex flex-row w-96 gap-2 items-center">
                                <span class="w-20">Width: </span><Input bind:value={customWidth} />
                            </div>
                            <div class="flex flex-row w-96 gap-2 items-center">
                                <span class="w-20">Height: </span><Input
                                    bind:value={customHeight}
                                />
                            </div>
                            <div class="flex flex-row justify-center gap-2">
                                <Button on:click={hideCustomSize}>CANCEL</Button>
                                <Button on:click={setCustomSize} color="green">OK</Button>
                            </div>
                        </div>
                    </div>
                </div>
                {#if select && select !== '#map' && select !== '#all'}
                    <button
                        class="absolute bottom-[70px] right-[60px] text-white"
                        on:click={moveObjectUp}
                    >
                        <img alt="Move up" width="32" height="32" src="icons/MoveUp.svg" />
                    </button>
                    <button
                        class="absolute bottom-[20px] right-[60px] text-white"
                        on:click={moveObjectDown}
                    >
                        <img alt="Move down" width="32" height="32" src="icons/MoveDown.svg" />
                    </button>
                    <button
                        class="absolute bottom-[45px] right-[90px] text-white"
                        on:click={moveObjectLeft}
                    >
                        <img alt="Move left" width="32" height="32" src="icons/MoveLeft.svg" />
                    </button>
                    <button
                        class="absolute bottom-[45px] right-[30px] text-white"
                        on:click={moveObjectRight}
                    >
                        <img alt="Move right" width="32" height="32" src="icons/MoveRight.svg" />
                    </button>
                    <button
                        class="absolute bottom-[65px] right-[130px] text-white"
                        on:click={rotateObjectAntiClockwise}
                    >
                        <img
                            alt="Rotate anti-clockwise"
                            width="32"
                            height="32"
                            src="icons/FieldAcw.svg"
                        />
                    </button>
                    <button
                        class="absolute bottom-[25px] right-[130px] text-white"
                        on:click={rotateObjectClockwise}
                    >
                        <img
                            alt="Rotate clockwise"
                            width="32"
                            height="32"
                            src="icons/FieldCw.svg"
                        />
                    </button>
                {/if}
                {#if selectedObject && select !== '#robot' && !selectedObject.editorGroup}
                    <div class="absolute left-2 bottom-2 z-40">
                        <ObjectPhysicsEditor
                            object={selectedObject}
                            objects={$sceneStore.objects}
                            joints={$sceneStore.joints ?? []}
                            on:change={updateObjectPhysics}
                        />
                    </div>
                {/if}
                <div class="h-full w-full overflow-hidden">
                    <ScenePreview
                        id="scene_preview"
                        unresolved={$componentStore.unresolved}
                        scene={$sceneStore}
                        class="h-full w-full"
                        map={mapFile}
                        {rotate}
                        {camera}
                        {tilt}
                        {select}
                    />
                </div>
            </div>
        </div>
    </div>
</Modal>
