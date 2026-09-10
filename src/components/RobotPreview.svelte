<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { WebGL, type CompiledModel } from '$lib/ldraw/gl';
    import { type Line, type Model } from '$lib/ldraw/components';

    export let id: string;
    export let robotModel: Model | undefined;
    export let compiledRobot: CompiledModel | undefined = undefined;
    export let enabled = true;
    export let select: number[] | undefined = undefined;
    export let gridScale = 0;

    let canRender = false;
    let gl: WebGL | undefined;
    let droppedFrames = 0;
    let lastFrame: number = 0;
    let angle = 0;
    let angle2 = 0;
    let zoomDistance = 20;
    let canvasElement: HTMLCanvasElement | undefined;
    const gridColour = {
        code: 'grid',
        inheritSurface: false,
        inheritEdge: false,
        surface: { r: 0.34, g: 0.4, b: 0.44, a: 1.0 },
        edge: { r: 0.34, g: 0.4, b: 0.44, a: 1.0 }
    };

    function doCompile(robot: Model | undefined, select: number[] | undefined) {
        if (!robot) {
            return undefined;
        }
        if (gl) {
            return gl.compileModel(robot, { select: select });
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
        renderRobot();
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

    function renderRobot() {
        if (!gl) {
            return;
        }
        if (!compiledRobot) {
            gl.clearColour(1.0, 1.0, 1.0);
            gl.clear();
            return;
        }
        gl.resizeToFit();
        gl.setModelIdentity();
        gl.clearColour(0.0, 0.0, 0.0);
        gl.clear();
        gl.translate(0, 0, -zoomDistance);
        gl.rotate(angle, 0.0, 1.0, 0.0);
        //gl.rotate(angle2, 1.0, 0.0, 0.0);
        drawGrid();
        if (compiledRobot) {
            gl.scale(0.05);
            gl.drawCompiled(compiledRobot);
        }
        gl.flush();
        angle = angle + 5 * 0.1;
        angle2 = angle2 + 5 * 1.37 * 0.1;
        if (angle > 360) {
            angle = angle - 360;
        }
        if (angle2 > 360) {
            angle2 = angle2 - 360;
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
        zoomDistance = clamp(zoomDistance * factor, 4, 80);
        queueRender();
    }

    function drawGrid() {
        if (!gl || gridScale <= 0) {
            return;
        }
        const halfSize = Math.max(200, gridScale * 8);
        const lines: Line[] = [];
        for (let i = -halfSize; i <= halfSize; i += gridScale) {
            lines.push({
                colour: gridColour,
                p1: { x: -halfSize, y: -2, z: i },
                p2: { x: halfSize, y: -2, z: i }
            });
            lines.push({
                colour: gridColour,
                p1: { x: i, y: -2, z: -halfSize },
                p2: { x: i, y: -2, z: halfSize }
            });
        }
        gl.setBrightness(0.5);
        gl.drawLines(lines);
        gl.setBrightness(1.0);
    }

    onMount(() => {
        const canvas = document.getElementById(id);
        if (canvas) {
            canvasElement = canvas as HTMLCanvasElement;
            canvasElement.addEventListener('wheel', handleWheel, { passive: false });
            gl = WebGL.create(canvasElement);
            if (gl) {
                gl.mindist = 0.01;
                gl.maxdist = 50.0;
                compiledRobot = doCompile(robotModel, select);
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
    });

    $: compiledRobot = doCompile(robotModel, select);
    $: checkEnabled(enabled);
</script>

<canvas {id} class={$$props.class}></canvas>
