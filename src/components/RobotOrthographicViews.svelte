<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { WebGL, type CompiledModel } from '$lib/ldraw/gl';
    import { type Model } from '$lib/ldraw/components';

    export let id: string;
    export let robotModel: Model | undefined;
    export let compiledRobot: CompiledModel | undefined = undefined;
    export let enabled = true;

    interface ViewRotation {
        angle: number;
        x: number;
        y: number;
        z: number;
    }

    interface View {
        label: string;
        rotations: ViewRotation[];
    }

    const views: View[] = [
        { label: 'Front', rotations: [{ angle: 0, x: 0, y: 1, z: 0 }] },
        { label: 'Top', rotations: [{ angle: 90, x: 1, y: 0, z: 0 }] },
        { label: 'Right', rotations: [{ angle: -90, x: 0, y: 1, z: 0 }] },
        {
            label: 'Isometric',
            rotations: [
                { angle: 45, x: 0, y: 1, z: 0 },
                { angle: 30, x: 1, y: 0, z: 0 }
            ]
        }
    ];
    const isoIndex = views.length - 1;
    const spinSensitivity = 0.5;

    let zooms = views.map(() => 1);
    let spinYaw = 0;
    let spinPitch = 0;
    let dragging = false;
    let lastPointer = { x: 0, y: 0 };

    let canRender = false;
    let gl: WebGL | undefined;
    let canvasElement: HTMLCanvasElement | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let renderQueued = false;
    let frameHandle = 0;

    function doCompile(robot: Model | undefined) {
        if (!robot || !gl) {
            return undefined;
        }
        return gl.compileModel(robot, { rescale: false });
    }

    function clamp(value: number, min: number, max: number) {
        return Math.min(max, Math.max(min, value));
    }

    function queueRender() {
        if (!canRender || renderQueued) {
            return;
        }
        renderQueued = true;
        frameHandle = requestAnimationFrame(() => {
            renderQueued = false;
            frameHandle = 0;
            renderViews();
        });
    }

    function renderViews() {
        if (!gl) {
            return;
        }
        const model = compiledRobot;
        if (!model) {
            gl.resizeToFit();
            gl.clearColour(1.0, 1.0, 1.0);
            gl.clear();
            return;
        }
        if (!canvasElement) {
            return;
        }
        gl.resizeToFit();
        const tileWidth = canvasElement.width / 2;
        const tileHeight = canvasElement.height / 2;
        if (tileWidth <= 0 || tileHeight <= 0) {
            return;
        }

        const bbox = model.bbox;
        const sizeX = bbox.max.x - bbox.min.x;
        const sizeY = bbox.max.y - bbox.min.y;
        const sizeZ = bbox.max.z - bbox.min.z;
        const centre = {
            x: (bbox.min.x + bbox.max.x) / 2,
            y: (bbox.min.y + bbox.max.y) / 2,
            z: (bbox.min.z + bbox.max.z) / 2
        };
        // A bounding sphere keeps every view inside its tile at any spin angle.
        const radius = 0.5 * Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ) || 1;
        const depthRange = radius * 2;
        const aspect = tileWidth / tileHeight;

        gl.setModelIdentity();
        gl.clearColour(0.0, 0.0, 0.0);
        gl.clear();
        gl.clearDepth();
        gl.setDepthTest(true);

        views.forEach((view, index) => {
            const zoom = zooms[index] || 1;
            const extent = (radius * 1.05) / zoom;
            const rx = aspect >= 1 ? extent * aspect : extent;
            const ry = aspect >= 1 ? extent : extent / aspect;
            const col = index % 2;
            const row = Math.floor(index / 2);
            gl!.setViewport(col * tileWidth, (1 - row) * tileHeight, tileWidth, tileHeight);
            gl!.setOrtho(-rx, rx, -ry, ry, -depthRange, depthRange);
            gl!.setModelIdentity();
            for (const rotation of view.rotations) {
                gl!.rotate(rotation.angle, rotation.x, rotation.y, rotation.z);
            }
            if (spinYaw) {
                gl!.rotate(spinYaw, 0.0, 1.0, 0.0);
            }
            if (spinPitch) {
                gl!.rotate(spinPitch, 1.0, 0.0, 0.0);
            }
            gl!.translate(-centre.x, -centre.y, -centre.z);
            gl!.setBrightness(1.0);
            gl!.drawCompiled(model);
        });
        gl.flush();
    }

    function updateZoom(index: number, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        zooms[index] = Number(input.value);
        queueRender();
    }

    function startDrag(event: PointerEvent) {
        if ((event.target as HTMLElement)?.tagName === 'INPUT') {
            return;
        }
        dragging = true;
        lastPointer = { x: event.clientX, y: event.clientY };
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }

    function moveDrag(event: PointerEvent) {
        if (!dragging) {
            return;
        }
        const dx = event.clientX - lastPointer.x;
        const dy = event.clientY - lastPointer.y;
        lastPointer = { x: event.clientX, y: event.clientY };
        spinYaw = spinYaw + dx * spinSensitivity;
        spinPitch = clamp(spinPitch + dy * spinSensitivity, -89, 89);
        queueRender();
    }

    function endDrag(event: PointerEvent) {
        if (!dragging) {
            return;
        }
        dragging = false;
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    }

    function checkEnabled(value: boolean) {
        if (value) {
            queueRender();
        }
    }

    onMount(() => {
        const canvas = document.getElementById(id);
        if (!canvas) {
            console.log('No WebGL available');
            return;
        }
        canvasElement = canvas as HTMLCanvasElement;
        gl = WebGL.create(canvasElement);
        if (gl) {
            gl.mindist = 0.01;
            gl.maxdist = 50.0;
            compiledRobot = compiledRobot ?? doCompile(robotModel);
        }
        canRender = true;
        if (canvasElement && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => queueRender());
            resizeObserver.observe(canvasElement);
        }
        queueRender();
    });

    onDestroy(() => {
        canRender = false;
        resizeObserver?.disconnect();
        resizeObserver = undefined;
        if (frameHandle) {
            cancelAnimationFrame(frameHandle);
            frameHandle = 0;
        }
    });

    $: compiledRobot = compiledRobot ?? doCompile(robotModel);
    $: if (compiledRobot) {
        queueRender();
    }
    $: checkEnabled(enabled);
</script>

<div class="relative h-full w-full">
    <canvas {id} class="h-full w-full"></canvas>
    {#if !compiledRobot}
        <p class="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            No robot model loaded.
        </p>
    {:else}
        <div class="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {#each views as view, index}
                <div
                    class="relative flex flex-col justify-between {index === isoIndex
                        ? 'touch-none cursor-grab pointer-events-auto'
                        : 'pointer-events-none'}"
                    class:cursor-grabbing={index === isoIndex && dragging}
                    title={index === isoIndex ? 'Drag to spin the robot' : undefined}
                    on:pointerdown={index === isoIndex ? startDrag : undefined}
                    on:pointermove={index === isoIndex ? moveDrag : undefined}
                    on:pointerup={index === isoIndex ? endDrag : undefined}
                    on:pointercancel={index === isoIndex ? endDrag : undefined}
                >
                    <span class="p-1 text-xs font-medium text-gray-300">
                        {view.label}{index === isoIndex ? ' · drag' : ''}
                    </span>
                    <div class="pointer-events-auto px-2 pb-1">
                        <input
                            type="range"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={zooms[index]}
                            aria-label={`${view.label} zoom`}
                            class="h-1 w-full cursor-pointer accent-gray-300"
                            on:input={(event) => updateZoom(index, event)}
                            on:pointerdown={(event) => event.stopPropagation()}
                        />
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
