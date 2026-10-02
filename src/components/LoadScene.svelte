<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { Button, Input, Modal } from 'flowbite-svelte';
    import {
        type Model,
        loadModel,
        setStudioMode,
        componentStore,
        setRobotFromContent,
        updateUnresolvedParts,
        assetUrl
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
    import { parseRobotArchiveEntry, ROBOT_ARCHIVE_ENTRY } from '$lib/spike/robot-archive';
    import {
        M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
        parseM01ObservationProfileArchiveEntry,
        type M01ObservationProfileLoadedCallback
    } from '$lib/spike/m01-observation-profile-archive';
    import { parseSceneDefinition } from '$lib/spike/scene-schema';
    import {
        loadProjectArchive,
        type ProjectArchivePayload,
        type ProjectArchiveProjectPayload
    } from '$lib/spike/project-archive';
    import { sceneFromProjectPayload } from '$lib/spike/project-restore';
    import { WebGLCompiler } from '$lib/ldraw/gl';
    import UnsavedChangesModal from '$components/UnsavedChangesModal.svelte';
    import {
        canProceedWithDestructiveAction,
        projectDirtyStore,
        shouldConfirmDestructiveAction
    } from '$lib/spike/project-dirty-state';
    import {
        createModelPhysicsArticulation,
        findBundledModelPhysics,
        parseModelPhysicsSidecar
    } from '$lib/physics/articulation-presets';

    /** Project archive packaged with the deployment (mat, robot, missions, program). */
    const PACKAGED_PROJECT_PATH = 'season/default.lsp-project';

    export let modalOpen = false;
    /** Called after a successful scene commit; `undefined` means this legacy archive has no profile. */
    export let onM01ObservationProfileLoaded: M01ObservationProfileLoadedCallback | undefined =
        undefined;
    /** Called after an archived robot has been restored and the scene commit succeeds. */
    export let onRobotModelLoaded: ((robot: Model) => void) | undefined = undefined;
    /** Called after a project archive has committed its scene and model assets. */
    export let onProjectArchiveLoaded:
        | ((payload: ProjectArchiveProjectPayload) => void | Promise<void>)
        | undefined = undefined;
    /** Called after a legacy scene archive has successfully replaced the current scene. */
    export let onSceneLoaded: (() => void) | undefined = undefined;
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
    let projectLoadStatus = '';
    let projectStatusTimer: ReturnType<typeof setTimeout> | undefined;
    let packagedProjectLoaded = false;
    let projectLoadError: string | undefined;
    let unsavedChangesOpen = false;
    let pendingFileInput: 'load_scene_file' | 'load_project_file' | undefined;

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

    function fitRobotPhysicsToModel(
        model: Model,
        physics: NonNullable<SceneObject['physics']>
    ): NonNullable<SceneObject['physics']> {
        const bounds = new WebGLCompiler().compileModel(model, {
            rescale: false,
            recenter: true
        }).bbox;
        const sizeMm = {
            x: Math.max(1, bounds.max.x - bounds.min.x),
            y: Math.max(1, bounds.max.y - bounds.min.y),
            z: Math.max(1, bounds.max.z - bounds.min.z)
        };
        return {
            ...physics,
            autoCollider: false,
            colliders: [{ shape: 'box', sizeMm }]
        };
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
            sceneStore.update((old) => ({
                ...old,
                objects: [...old.objects]
            }));
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
                { name: 'Load packaged BIOGLOW setup', action: () => loadPackagedProject() },
                { name: 'Load mat', action: () => loadBackgroundMap() },
                { name: 'Load object', action: () => loadObject() },
                { name: 'Load legacy scene setup (.spk)', action: () => loadScene() },
                { name: 'Restore saved project (.lsp-project)', action: () => loadProject() },
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

    function clickFileInput(id: 'load_scene_file' | 'load_project_file'): void {
        document.getElementById(id)?.click();
    }

    function requestFileLoad(id: 'load_scene_file' | 'load_project_file'): void {
        if (shouldConfirmDestructiveAction($projectDirtyStore)) {
            pendingFileInput = id;
            unsavedChangesOpen = true;
            return;
        }
        clickFileInput(id);
    }

    function loadScene() {
        requestFileLoad('load_scene_file');
    }

    function loadProject() {
        requestFileLoad('load_project_file');
    }

    function cancelPendingFileLoad(): void {
        pendingFileInput = undefined;
        unsavedChangesOpen = false;
    }

    function confirmPendingFileLoad(): void {
        const input = pendingFileInput;
        if (!input || !canProceedWithDestructiveAction($projectDirtyStore, 'discard')) return;
        pendingFileInput = undefined;
        unsavedChangesOpen = false;
        clickFileInput(input);
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
                try {
                    const first = fileElement.files[0];
                    const zip = new JSZip();
                    const zipFile = await zip.loadAsync(first);
                    let map: Blob | undefined = undefined;
                    const jsonFile = zipFile.file('scene.json');
                    if (!jsonFile) {
                        throw new Error('Invalid scene file format, missing scene.json');
                    }
                    const sceneDefContents = await jsonFile.async('string');
                    const scene = parseSceneDefinition(JSON.parse(sceneDefContents));
                    const robotFile = zipFile.file(ROBOT_ARCHIVE_ENTRY);
                    const robotContent = robotFile
                        ? parseRobotArchiveEntry(await robotFile.async('string'))
                        : undefined;
                    const profileFile = zipFile.file(M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY);
                    const loadedM01ObservationProfile = profileFile
                        ? parseM01ObservationProfileArchiveEntry(await profileFile.async('string'))
                        : undefined;
                    const objects: SceneObject[] = [];

                    const mapFile = zipFile.file('mat.jpg');
                    if (mapFile) {
                        map = await mapFile.async('blob');
                    }

                    const loadedRobot = robotContent
                        ? setRobotFromContent(robotContent)
                        : $componentStore.robotModel;
                    const robot = {
                        id: scene.robot.id,
                        anchored: scene.robot.anchored,
                        position: scene.robot.position,
                        rotation: scene.robot.rotation,
                        name: scene.robot.name,
                        bricks: loadedRobot,
                        physics: loadedRobot
                            ? fitRobotPhysicsToModel(
                                  loadedRobot,
                                  scene.robot.physics ?? {
                                      bodyType: 'dynamic',
                                      massKg: 0.95,
                                      friction: 0.7,
                                      restitution: 0,
                                      enabledRotations: { x: false, y: true, z: false },
                                      colliders: []
                                  }
                              )
                            : scene.robot.physics,
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
                            stableObjectFile ??
                            zipFile.file(legacySceneObjectArchiveEntry(obj.name));
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
                    onM01ObservationProfileLoaded?.(loadedM01ObservationProfile);
                    if (robotContent && loadedRobot) onRobotModelLoaded?.(loadedRobot);
                    onSceneLoaded?.();
                } catch (error) {
                    console.error('Failed to load scene archive:', error);
                }
            }
        }
    }

    function setProjectLoadStatus(message: string, autoDismissMs?: number): void {
        if (projectStatusTimer) {
            clearTimeout(projectStatusTimer);
            projectStatusTimer = undefined;
        }
        projectLoadStatus = message;
        if (autoDismissMs !== undefined) {
            projectStatusTimer = setTimeout(() => {
                projectLoadStatus = '';
                projectStatusTimer = undefined;
            }, autoDismissMs);
        }
    }

    async function restoreProjectArchive(archive: Blob): Promise<void> {
        projectLoadError = undefined;
        setProjectLoadStatus('Loading project archive…', 2000);
        try {
            const payload: ProjectArchivePayload = await loadProjectArchive(archive);
            if (payload.sourceFormat !== 'project') {
                throw new Error(
                    'This file is a legacy scene setup. Use Load legacy scene setup instead.'
                );
            }
            const loadedRobot = setRobotFromContent(payload.robot.content);
            const map = payload.map ? new Blob([payload.map], { type: 'image/jpeg' }) : undefined;
            const restoredScene = sceneFromProjectPayload(payload, loadedRobot, map, loadModel);
            updateUnresolvedParts();
            sceneStore.set(restoredScene);
            mapFile = map;
            numberOfLoads++;
            setSelected('#all');
            onM01ObservationProfileLoaded?.(payload.calibration?.m01ObservationProfile);
            onRobotModelLoaded?.(loadedRobot);
            await onProjectArchiveLoaded?.(payload);
            let status = `Saved project restored: ${payload.project.season.reference.name}. Field, robot setup, program, and supported settings were loaded.`;
            if (payload.missingModelIds.length > 0) {
                status += ` ${payload.missingModelIds.length} model(s) are missing from the archive.`;
            }
            setProjectLoadStatus(status, 2000);
        } catch (error) {
            projectLoadError =
                error instanceof Error ? error.message : 'The project could not be loaded.';
            setProjectLoadStatus('Project restore failed. The current scene was kept unchanged.');
        }
    }

    async function loadProjectFromFile() {
        const element = document.getElementById('load_project_file');
        const file = (element as HTMLInputElement | null)?.files?.[0];
        if (!file) return;
        try {
            await restoreProjectArchive(file);
        } finally {
            const input = element as HTMLInputElement | null;
            if (input) input.value = '';
        }
    }

    /** Load the project archive packaged with the deployment (mat, robot, missions, program). */
    async function loadPackagedProject(): Promise<void> {
        setProjectLoadStatus('Loading packaged setup…', 2000);
        const response = await fetch(assetUrl(PACKAGED_PROJECT_PATH));
        if (!response.ok) {
            throw new Error(`Packaged setup unavailable (${response.status}).`);
        }
        const archive = await response.blob();
        await restoreProjectArchive(archive);
    }

    async function autoLoadPackagedProject(): Promise<void> {
        if (packagedProjectLoaded) return;
        packagedProjectLoaded = true;
        if ($sceneStore.objects.length > 0 || $sceneStore.map) return;
        try {
            await loadPackagedProject();
        } catch {
            setProjectLoadStatus('Packaged setup was not found; starting from an empty field.');
        }
    }

    onMount(() => {
        autoLoadPackagedProject();
    });

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

    function updateSelectedObjects(update: (object: SceneObject) => void) {
        if (!modalOpen || !select || select === '#all' || select === '#map') return;
        sceneStore.update((old) => {
            const updateObject = (object: SceneObject) => {
                const next = {
                    ...object,
                    position: object.position ? { ...object.position } : undefined
                };
                update(next);
                if (object === old.robot || editorKey(object) === select) selectedObject = next;
                return next;
            };
            return {
                ...old,
                robot: select === '#robot' ? updateObject(old.robot) : old.robot,
                objects:
                    select === '#robot'
                        ? old.objects
                        : old.objects.map((object) =>
                              editorKey(object) === select ? updateObject(object) : object
                          )
            };
        });
    }

    function moveObjectLeft() {
        updateSelectedObjects((object) => {
            if (object.position) object.position.x -= 10.0;
        });
    }

    function moveObjectRight() {
        updateSelectedObjects((object) => {
            if (object.position) object.position.x += 10.0;
        });
    }

    function moveObjectUp() {
        updateSelectedObjects((object) => {
            if (object.position) object.position.z -= 10.0;
        });
    }

    function moveObjectDown() {
        updateSelectedObjects((object) => {
            if (object.position) object.position.z += 10.0;
        });
    }

    function rotateObjectClockwise() {
        updateSelectedObjects((object) => {
            object.rotation = (object.rotation ?? 0) - 10.0;
            object.rotationQuaternion = undefined;
        });
    }

    function rotateObjectAntiClockwise() {
        updateSelectedObjects((object) => {
            object.rotation = (object.rotation ?? 0) + 10.0;
            object.rotationQuaternion = undefined;
        });
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
        if (projectStatusTimer) {
            clearTimeout(projectStatusTimer);
        }
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
    <input
        type="file"
        id="load_project_file"
        class="hidden"
        accept=".lsp-project,application/zip"
        on:change={loadProjectFromFile}
    />
{/key}
<Modal
    backdropClass="fixed inset-0 z-[80] bg-gray-900 bg-opacity-50 dark:bg-opacity-80"
    dialogClass="fixed top-0 start-0 end-0 h-modal md:inset-0 md:h-full z-[90] w-full p-4 flex"
    title="Expert Setup: table and launch"
    size="xl"
    bind:open={modalOpen}
>
    <div class="flex flex-col gap-1 h-[75dvh] relative overflow-hidden">
        <Menu {menu} class="absolute z-50" />
        {#if projectLoadStatus}
            <div
                class="absolute left-2 right-2 top-2 z-[60] rounded border bg-white px-3 py-2 text-sm shadow"
                class:border-red-300={projectLoadError}
                class:bg-red-50={projectLoadError}
                role={projectLoadError ? 'alert' : 'status'}
                aria-live="polite"
            >
                <p>{projectLoadStatus}</p>
                {#if projectLoadError}<p class="mt-1 text-red-700">{projectLoadError}</p>{/if}
            </div>
        {/if}
        <div class="flex flex-row flex-1 relative overflow-hidden">
            <div class="flex-1 h-full relative">
                {#if selectedText && $componentStore.unresolved.length == 0}
                    <div class="absolute right-0 top-0 text-white mx-2 my-1">{selectedText}</div>
                {/if}
                {#if $componentStore.unresolved.length > 0 || ($componentStore.missing?.length ?? 0) > 0}
                    <div class="absolute right-0 top-0 text-red-600 bg-white px-2 mx-2 my-1">
                        Missing parts: {($componentStore.missing?.length ?? 0) +
                            $componentStore.unresolved.length}
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
<UnsavedChangesModal
    open={unsavedChangesOpen}
    actionLabel={pendingFileInput === 'load_project_file' ? 'load this project' : 'load this scene'}
    on:cancel={cancelPendingFileLoad}
    on:discard={confirmPendingFileLoad}
/>
