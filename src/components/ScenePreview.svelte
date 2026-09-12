<script lang="ts">
    import { boundaryStore } from '$lib/spike/scene';
    import { onDestroy, onMount } from 'svelte';
    import { WebGL, type MapTexture } from '$lib/ldraw/gl';
    import { brickColour, type Line, type Quad } from '$lib/ldraw/components';
    import { type SceneStore, type SceneObject } from '$lib/spike/scene';
    import * as m4 from '$lib/ldraw/m4';

    export let id: string;
    export let scene: SceneStore;
    export let enabled = true;
    export let select: string | undefined = undefined;
    export let camera: 'top' | 'left' | 'right' | 'front' | 'back' | 'adaptive';
    export let robotFocus = false;
    export let tilt = true;
    export let rotate = false;
    export let unresolved: string[] = [];
    export let dimMap = false;
    export let gridScale = 0;

    let canRender = false;
    let gl: WebGL | undefined;
    let droppedFrames = 0;
    let lastFrame: number = 0;
    let angle = 0;
    let mapTexture: MapTexture | null = null;
    let canvasElement: HTMLCanvasElement | undefined;
    let sceneDistance = 30;
    let robotFocusDistance = 3;
    let brown = brickColour('86');
    let red = brickColour('4');
    const gridColour = {
        code: 'grid',
        inheritSurface: false,
        inheritEdge: false,
        surface: { r: 0.5, g: 0.56, b: 0.58, a: 1.0 },
        edge: { r: 0.5, g: 0.56, b: 0.58, a: 1.0 }
    };
    const physicsDebugColour = brickColour('4');

    function debugBoxLines(x: number, y: number, z: number): Line[] {
        const hx = x / 2;
        const hy = y / 2;
        const hz = z / 2;
        const points = [
            { x: -hx, y: -hy, z: -hz },
            { x: hx, y: -hy, z: -hz },
            { x: hx, y: hy, z: -hz },
            { x: -hx, y: hy, z: -hz },
            { x: -hx, y: -hy, z: hz },
            { x: hx, y: -hy, z: hz },
            { x: hx, y: hy, z: hz },
            { x: -hx, y: hy, z: hz }
        ];
        const edges = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [4, 5],
            [5, 6],
            [6, 7],
            [7, 4],
            [0, 4],
            [1, 5],
            [2, 6],
            [3, 7]
        ];
        return edges.map(([a, b]) => ({
            colour: physicsDebugColour,
            p1: points[a],
            p2: points[b]
        }));
    }

    function drawPhysicsDebug(object: SceneObject) {
        if (!gl || !$boundaryStore.debugPhysics) return;
        for (const collider of object.physics?.colliders ?? []) {
            const size =
                collider.shape === 'box'
                    ? collider.sizeMm
                    : collider.shape === 'cylinder'
                      ? { x: collider.radiusMm * 2, y: collider.heightMm, z: collider.radiusMm * 2 }
                      : {
                            x: collider.radiusMm * 2,
                            y: collider.heightMm + collider.radiusMm * 2,
                            z: collider.radiusMm * 2
                        };
            gl.pushMatrix();
            if (collider.positionMm)
                gl.translate(collider.positionMm.x, collider.positionMm.y, collider.positionMm.z);
            if (collider.rotation) gl.rotateQuaternion(collider.rotation);
            gl.drawLines(debugBoxLines(size.x, size.y, size.z));
            gl.popMatrix();
        }
        for (const joint of scene.joints ?? []) {
            if (joint.childId !== object.id) continue;
            const anchor = joint.childAnchorMm;
            const radius = 12;
            gl.drawLines([
                {
                    colour: physicsDebugColour,
                    p1: { x: anchor.x - radius, y: anchor.y, z: anchor.z },
                    p2: { x: anchor.x + radius, y: anchor.y, z: anchor.z }
                },
                {
                    colour: physicsDebugColour,
                    p1: { x: anchor.x, y: anchor.y - radius, z: anchor.z },
                    p2: { x: anchor.x, y: anchor.y + radius, z: anchor.z }
                },
                {
                    colour: physicsDebugColour,
                    p1: { x: anchor.x, y: anchor.y, z: anchor.z - radius },
                    p2: { x: anchor.x, y: anchor.y, z: anchor.z + radius }
                }
            ]);
        }
    }

    function doRender(timestamp: number) {
        const frameTime = timestamp - lastFrame;
        // Aim for 30 fps
        const frames = Math.round(frameTime / 33);
        if (frames > 1 && lastFrame > 0) {
            droppedFrames++;
            // TODO: Drop the model detail
        }
        lastFrame = timestamp;
        renderScene();
        if (canRender && enabled) {
            requestAnimationFrame(doRender);
        } else {
            lastFrame = 0;
        }
    }

    function queueRender() {
        if (!canRender) {
            return;
        }
        requestAnimationFrame(doRender);
    }

    function renderScene() {
        if (!gl) {
            return;
        }
        let leftBarrierHit = false;
        let rightBarrierHit = false;
        let bottomBarrierHit = false;
        let topBarrierHit = false;
        gl.resizeToFit();
        gl.setModelIdentity();
        gl.clearColour(0.0, 0.0, 0.0);
        gl.clear();
        if (robotFocus) {
            gl.translate(0, 0, -robotFocusDistance);
        } else {
            gl.translate(0, 0, -sceneDistance);
        }
        // Make unit meters
        gl.scale(0.01);

        if (tilt) {
            if (robotFocus) {
                gl.rotate(30, 1.0, 0.0, 0.0);
            } else {
                gl.rotate(45, 1.0, 0.0, 0.0);
            }
        }
        if (camera == 'adaptive') {
            if (gl.getCanvasAspect() >= 1.0) {
                gl.rotate(0, 0.0, 1.0, 0.0);
            } else {
                gl.rotate(90, 0.0, 1.0, 0.0);
            }
        } else if (camera == 'top') {
            gl.rotate(90, 1.0, 0.0, 0.0);
        } else if (camera == 'left') {
            gl.rotate(90, 0.0, 1.0, 0.0);
        } else if (camera == 'right') {
            gl.rotate(-90, 0.0, 1.0, 0.0);
        } else if (camera == 'front') {
            gl.rotate(0, 0.0, 1.0, 0.0);
        } else if (camera == 'back') {
            gl.rotate(180, 0.0, 1.0, 0.0);
        }
        if (rotate) {
            gl.rotate(angle, 0.0, 1.0, 0.0);
        }
        if (scene.robot && scene.robot.compiled && mapTexture) {
            const w = mapTexture.width / 2;
            const h = mapTexture.height / 2;
            const obj = scene.robot;
            const bbox = scene.robot.compiled.bbox;
            let sphereIntersect = false;
            const cx = 0.5 * (bbox.min.x + bbox.max.x);
            const cy = 0.5 * (bbox.min.y + bbox.max.y);
            const cz = 0.5 * (bbox.min.z + bbox.max.z);
            let matrix = m4.identity();
            if (obj.position) {
                matrix = m4.translate(matrix, obj.position.x, obj.position.y, obj.position.z);
            }
            if (obj.rotation) {
                //matrix = m4.axisRotate(matrix, [0.0, 1.0, 0.0], obj.rotation);
            }

            // Check bounding sphere first
            const c = m4.transformVector(matrix, [cx, cy, cz, 1.0]);
            if ((c[0] + w) * (c[0] + w) < bbox.radius) {
                sphereIntersect = true;
                // check bbox, left
            } else if ((c[0] - w) * (c[0] - w) < bbox.radius) {
                sphereIntersect = true;
                // check bbox, right
            } else if ((c[2] + h) * (c[2] + h) < bbox.radius) {
                sphereIntersect = true;
                // check bbox, bottom
            } else if ((c[2] - h) * (c[2] - h) < bbox.radius) {
                sphereIntersect = true;
                // check bbox, top
            }

            if (sphereIntersect) {
                // Do a quick check on min and max
                const p1 = [bbox.min.x, bbox.min.y, bbox.min.z, 1.0];
                const p2 = [bbox.max.x, bbox.min.y, bbox.min.z, 1.0];
                const p3 = [bbox.min.x, bbox.min.y, bbox.max.z, 1.0];
                const p4 = [bbox.max.x, bbox.min.y, bbox.max.z, 1.0];
                for (const p of [p1, p2, p3, p4]) {
                    const pt = m4.transformVector(matrix, p);
                    if (pt[0] < -w) {
                        leftBarrierHit = true;
                    }
                    if (pt[0] > w) {
                        rightBarrierHit = true;
                    }
                    if (pt[2] < -h) {
                        bottomBarrierHit = true;
                    }
                    if (pt[2] > h) {
                        topBarrierHit = true;
                    }
                }
            }
        }
        if (robotFocus) {
            if (scene.robot) {
                const obj = scene.robot;
                if (obj.rotationQuaternion) {
                    gl.rotateQuaternion(obj.rotationQuaternion, true);
                } else if (obj.rotation) {
                    gl.rotate(-obj.rotation, 0.0, 1.0, 0.0);
                }
                if (obj.position) {
                    gl.translate(-obj.position.x, -obj.position.y, -obj.position.z);
                }
            }
        }
        if (mapTexture) {
            const w = mapTexture.width / 2;
            const h = mapTexture.height / 2;
            if (dimMap) {
                gl.setBrightness(0.5);
            } else {
                if (select === '#map' || select === '#all') {
                    gl.setBrightness(1.0);
                } else {
                    gl.setBrightness(0.3);
                }
            }
            gl.pushMatrix();
            gl.drawTexturedQuad(mapTexture);
            gl.popMatrix();
            if (bottomBarrierHit || topBarrierHit || leftBarrierHit || rightBarrierHit) {
                gl.setBrightness(1.0);
            }
            if ($boundaryStore.draw || $boundaryStore.collisions) {
                const quads: Quad[] = [];
                const size = 50.0 * $boundaryStore.scale;
                if (bottomBarrierHit || $boundaryStore.draw) {
                    quads.push({
                        colour: bottomBarrierHit ? red : brown,
                        p1: { x: -w, y: 0.0, z: -h },
                        p2: { x: -w, y: size, z: -h },
                        p3: { x: w, y: size, z: -h },
                        p4: { x: w, y: 0.0, z: -h }
                    });
                }
                if (topBarrierHit || $boundaryStore.draw) {
                    quads.push({
                        colour: topBarrierHit ? red : brown,
                        p1: { x: -w, y: 0.0, z: h },
                        p2: { x: -w, y: size, z: h },
                        p3: { x: w, y: size, z: h },
                        p4: { x: w, y: 0.0, z: h }
                    });
                }
                if (rightBarrierHit || $boundaryStore.draw) {
                    quads.push({
                        colour: rightBarrierHit ? red : brown,
                        p1: { x: w, y: 0.0, z: -h },
                        p2: { x: w, y: size, z: -h },
                        p3: { x: w, y: size, z: h },
                        p4: { x: w, y: 0.0, z: h }
                    });
                }
                if (leftBarrierHit || $boundaryStore.draw) {
                    quads.push({
                        colour: leftBarrierHit ? red : brown,
                        p1: { x: -w, y: 0.0, z: -h },
                        p2: { x: -w, y: size, z: -h },
                        p3: { x: -w, y: size, z: h },
                        p4: { x: -w, y: 0.0, z: h }
                    });
                }
                gl.drawQuads(quads);
            }
            gl.setBrightness(1.0);
        }
        drawGrid();
        gl.translate(0, 0, 0);
        for (const obj of scene.objects) {
            if (select === (obj.editorGroup ?? obj.name) || select === '#all') {
                gl.setBrightness(1.0);
            } else {
                gl.setBrightness(0.3);
            }
            gl.pushMatrix();
            if (obj.position) {
                gl.translate(obj.position.x, obj.position.y, obj.position.z);
            }
            if (obj.rotationQuaternion) {
                gl.rotateQuaternion(obj.rotationQuaternion);
            } else if (obj.rotation) {
                gl.rotate(obj.rotation, 0.0, 1.0, 0.0);
            }
            if (obj.compiled) {
                gl.drawCompiled(obj.compiled);
            } else {
                gl.drawBox(100, 100, 100);
            }
            drawPhysicsDebug(obj);
            gl.popMatrix();
            gl.setBrightness(1.0);
        }

        if (scene.robot) {
            const obj = scene.robot;
            if (select === '#robot' || select === '#all') {
                gl.setBrightness(1.0);
            } else {
                gl.setBrightness(0.3);
            }
            gl.pushMatrix();
            if (obj.position) {
                gl.translate(obj.position.x, obj.position.y, obj.position.z);
            }
            if (obj.rotationQuaternion) {
                gl.rotateQuaternion(obj.rotationQuaternion);
            } else if (obj.rotation) {
                gl.rotate(obj.rotation, 0.0, 1.0, 0.0);
            }
            if (obj.compiled) {
                gl.drawCompiled(obj.compiled);
            } else {
                gl.drawBox(100, 100, 100);
            }
            drawPhysicsDebug(obj);
            gl.popMatrix();
            gl.setBrightness(1.0);
        }

        gl.flush();
        if (rotate) {
            angle = angle + 5 * 0.1;
            if (angle > 360) {
                angle = angle - 360;
            }
        } else {
            angle = 0;
        }
    }

    function checkEnabled(enabled: boolean) {
        if (enabled) {
            queueRender();
        }
    }

    function clamp(value: number, min: number, max: number) {
        return Math.min(max, Math.max(min, value));
    }

    function handleWheel(event: WheelEvent) {
        event.preventDefault();
        const factor = Math.exp(event.deltaY * 0.001);
        if (robotFocus) {
            robotFocusDistance = clamp(robotFocusDistance * factor, 0.6, 20);
        } else {
            sceneDistance = clamp(sceneDistance * factor, 4, 120);
        }
        queueRender();
    }

    function drawGrid() {
        if (!gl || gridScale <= 0) {
            return;
        }
        const width = mapTexture?.width ?? scene.mapWidth ?? 2000;
        const height = mapTexture?.height ?? scene.mapHeight ?? 1200;
        const halfWidth = Math.max(width / 2, gridScale * 4);
        const halfHeight = Math.max(height / 2, gridScale * 4);
        const startX = Math.ceil(-halfWidth / gridScale) * gridScale;
        const endX = Math.floor(halfWidth / gridScale) * gridScale;
        const startZ = Math.ceil(-halfHeight / gridScale) * gridScale;
        const endZ = Math.floor(halfHeight / gridScale) * gridScale;
        const lines: Line[] = [];

        for (let x = startX; x <= endX; x += gridScale) {
            lines.push({
                colour: gridColour,
                p1: { x, y: 1.0, z: -halfHeight },
                p2: { x, y: 1.0, z: halfHeight }
            });
        }
        for (let z = startZ; z <= endZ; z += gridScale) {
            lines.push({
                colour: gridColour,
                p1: { x: -halfWidth, y: 1.0, z },
                p2: { x: halfWidth, y: 1.0, z }
            });
        }

        gl.setBrightness(dimMap ? 0.8 : 0.45);
        gl.drawLines(lines);
        gl.setBrightness(1.0);
    }

    async function loadMapTexture(map: Blob | undefined) {
        if (!gl) {
            mapTexture = null;
            return;
        }
        if (mapTexture) {
            gl.deleteTexture(mapTexture.texture);
        }
        if (!map) {
            mapTexture = null;
            return;
        }
        mapTexture = await gl.loadTexture(map);
        // We could get the size from the texture.
        // But better not, since it isn't real units.
        // mapWidth = mapTexture.width;
        // mapHeight = mapTexture.height;
        if (mapTexture) {
            mapTexture.width = scene.mapWidth;
            mapTexture.height = scene.mapHeight;
        }
    }

    function loadRobot(robot: SceneObject, forceCompile: boolean, unresolved: string[]) {
        if (!gl) {
            return;
        }
        if (unresolved.length > 0) {
            return;
        }
        const obj = robot;
        if (obj.bricks) {
            if (!obj.compiled || forceCompile) {
                obj.compiled = gl.compileModel(obj.bricks, {
                    rescale: false,
                    recenter: !obj.preserveOrigin
                });
            }
        }
        if (!obj.position && obj.compiled && !obj.preserveOrigin) {
            obj.position = { x: 0.0, y: -obj.compiled.bbox.min.y, z: 0.0 };
        } else if (obj.compiled && obj.position && !obj.preserveOrigin) {
            obj.position = { x: obj.position.x, y: -obj.compiled.bbox.min.y, z: obj.position.z };
        }
    }

    function loadSceneItems(objects: SceneObject[], forceCompile: boolean, unresolved: string[]) {
        if (!gl) {
            return;
        }
        if (unresolved.length > 0) {
            return;
        }
        for (const obj of objects) {
            if (obj.bricks) {
                if (!obj.compiled || forceCompile) {
                    obj.compiled = gl.compileModel(obj.bricks, {
                        rescale: false,
                        recenter: !obj.preserveOrigin
                    });
                }
            }
            if (!obj.position && obj.compiled) {
                obj.position = { x: 0.0, y: -obj.compiled.bbox.min.y, z: 0.0 };
            }
        }
    }

    onMount(() => {
        const canvas = document.getElementById(id);
        if (canvas) {
            canvasElement = canvas as HTMLCanvasElement;
            canvasElement.addEventListener('wheel', handleWheel, { passive: false });
            gl = WebGL.create(canvasElement);
            if (gl) {
                loadSceneItems(scene.objects, false, unresolved);
                loadRobot(scene.robot, false, unresolved);
                loadMapTexture(scene.map);
            }
            canRender = true;
            queueRender();
        } else {
            console.log('No WebGL available');
        }
    });

    onDestroy(() => {
        canRender = false;
        canvasElement?.removeEventListener('wheel', handleWheel);
        if (mapTexture && gl) {
            gl.deleteTexture(mapTexture.texture);
            mapTexture = null;
        }
    });

    function setMapSize(scene: SceneStore) {
        if (mapTexture) {
            mapTexture.width = scene.mapWidth;
            mapTexture.height = scene.mapHeight;
        }
    }

    $: checkEnabled(enabled);
    $: loadMapTexture(scene.map);
    $: setMapSize(scene);
    $: loadSceneItems(scene.objects, false, unresolved);
    $: loadRobot(scene.robot, false, unresolved);
</script>

<canvas {id} class={$$props.class}></canvas>
