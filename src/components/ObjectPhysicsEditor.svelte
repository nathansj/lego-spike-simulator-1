<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type {
        ColliderDefinition,
        HingeAxis,
        JointDefinition,
        PhysicsBodyType,
        PhysicsDefinition,
        PhysicsVector
    } from '$lib/physics/types';
    import type { SceneObject } from '$lib/spike/scene';

    export let object: SceneObject;
    export let objects: SceneObject[] = [];
    export let joints: JointDefinition[] = [];

    const dispatch = createEventDispatcher<{ change: { joints: JointDefinition[] } }>();
    const axes: HingeAxis[] = ['x', 'y', 'z'];
    const quaternionComponents: ('x' | 'y' | 'z' | 'w')[] = ['x', 'y', 'z', 'w'];
    const colliderShapes: ('box' | 'cylinder' | 'capsule')[] = ['box', 'cylinder', 'capsule'];
    const bodyTypes: { value: PhysicsBodyType; label: string }[] = [
        { value: 'fixed', label: 'Fixed' },
        { value: 'dynamic', label: 'Dynamic' },
        { value: 'kinematic', label: 'Kinematic' },
        { value: 'trigger', label: 'Trigger' }
    ];

    function defaults(): PhysicsDefinition {
        return {
            bodyType: object.anchored ? 'fixed' : 'dynamic',
            autoCollider: true,
            massKg: object.anchored ? undefined : 0.1,
            friction: 0.7,
            restitution: 0,
            linearDamping: 0.1,
            angularDamping: 0.2,
            colliders: []
        };
    }

    $: physics = object.physics ?? defaults();
    $: objectJoint = joints.find((joint) => joint.childId === object.id);
    $: errors = validationErrors(physics, objectJoint);

    function commit(nextPhysics = physics, nextJoints = joints) {
        object.physics = nextPhysics;
        object.anchored = nextPhysics.bodyType === 'fixed';
        physics = nextPhysics;
        joints = nextJoints;
        dispatch('change', { joints: nextJoints });
    }

    function number(value: number, fallback = 0): number {
        return Number.isFinite(value) ? value : fallback;
    }

    function setBodyType(bodyType: PhysicsBodyType) {
        commit({
            ...physics,
            bodyType,
            massKg:
                bodyType === 'dynamic' || bodyType === 'kinematic'
                    ? (physics.massKg ?? 0.1)
                    : undefined
        });
    }

    function bodyTypeFromInput(event: Event) {
        setBodyType((event.currentTarget as HTMLSelectElement).value as PhysicsBodyType);
    }

    function jointTypeFromInput(event: Event) {
        addJoint((event.currentTarget as HTMLSelectElement).value as JointDefinition['type']);
    }

    function jointAxisFromInput(event: Event) {
        updateJoint({ axis: (event.currentTarget as HTMLSelectElement).value as HingeAxis });
    }

    function setNumber(
        key:
            | 'massKg'
            | 'friction'
            | 'restitution'
            | 'linearDamping'
            | 'angularDamping'
            | 'collisionGroup'
            | 'collisionMask',
        value: number
    ) {
        commit({ ...physics, [key]: number(value) });
    }

    function setBoolean(key: 'autoCollider' | 'continuousCollisionDetection', value: boolean) {
        commit({ ...physics, [key]: value });
    }

    function setMotionLock(
        kind: 'enabledTranslations' | 'enabledRotations',
        axis: HingeAxis,
        value: boolean
    ) {
        const current = physics[kind] ?? { x: true, y: true, z: true };
        commit({ ...physics, [kind]: { ...current, [axis]: value } });
    }

    function addCollider(shape: 'box' | 'cylinder' | 'capsule') {
        const collider: ColliderDefinition =
            shape === 'box'
                ? { shape, sizeMm: { x: 100, y: 100, z: 100 } }
                : { shape, radiusMm: 50, heightMm: 100 };
        commit({ ...physics, autoCollider: false, colliders: [...physics.colliders, collider] });
    }

    function updateCollider(index: number, update: Partial<ColliderDefinition>) {
        const colliders = physics.colliders.map((collider, colliderIndex) =>
            colliderIndex === index ? ({ ...collider, ...update } as ColliderDefinition) : collider
        );
        commit({ ...physics, colliders });
    }

    function updateColliderVector(
        index: number,
        key: 'positionMm' | 'sizeMm',
        axis: HingeAxis,
        value: number
    ) {
        const collider = physics.colliders[index];
        const current =
            key === 'sizeMm' && collider.shape === 'box'
                ? collider.sizeMm
                : (collider.positionMm ?? { x: 0, y: 0, z: 0 });
        updateCollider(index, { [key]: { ...current, [axis]: number(value) } });
    }

    function updateColliderRotation(
        index: number,
        component: 'x' | 'y' | 'z' | 'w',
        value: number
    ) {
        const rotation = physics.colliders[index].rotation ?? { x: 0, y: 0, z: 0, w: 1 };
        updateCollider(index, { rotation: { ...rotation, [component]: number(value) } });
    }

    function removeCollider(index: number) {
        commit({
            ...physics,
            colliders: physics.colliders.filter((_, colliderIndex) => colliderIndex !== index)
        });
    }

    function addJoint(type: JointDefinition['type']) {
        if (!object.id) return;
        const common = {
            id: `joint-${object.id}-${Date.now()}`,
            parentId: '#world' as const,
            childId: object.id,
            parentAnchorMm: { x: 0, y: 0, z: 0 },
            childAnchorMm: { x: 0, y: 0, z: 0 },
            axis: 'z' as const
        };
        let joint: JointDefinition;
        if (type === 'hinge')
            joint = { ...common, type, limitsRadians: { min: -Math.PI, max: Math.PI } };
        else if (type === 'slider') joint = { ...common, type, limitsMm: { min: 0, max: 100 } };
        else if (type === 'spring')
            joint = { ...common, type, restLengthMm: 100, stiffness: 10, damping: 1 };
        else if (type === 'latch') joint = { ...common, type, releaseForceN: 10 };
        else joint = { ...common, type };
        commit(physics, [...joints.filter((candidate) => candidate.childId !== object.id), joint]);
    }

    function updateJoint(update: Partial<JointDefinition>) {
        if (!objectJoint) return;
        const next = joints.map((joint) =>
            joint.id === objectJoint?.id ? ({ ...joint, ...update } as JointDefinition) : joint
        );
        commit(physics, next);
    }

    function updateJointVector(
        key: 'parentAnchorMm' | 'childAnchorMm',
        axis: HingeAxis,
        value: number
    ) {
        if (!objectJoint) return;
        updateJoint({ [key]: { ...objectJoint[key], [axis]: number(value) } });
    }

    function removeJoint() {
        if (!objectJoint) return;
        commit(
            physics,
            joints.filter((joint) => joint.id !== objectJoint?.id)
        );
    }

    function setJointMotorEnabled(enabled: boolean) {
        if (!objectJoint || (objectJoint.type !== 'hinge' && objectJoint.type !== 'slider')) return;
        updateJoint({
            motor: enabled
                ? { targetPosition: 0, targetVelocity: 0, stiffness: 10, damping: 1 }
                : undefined
        });
    }

    function updateJointMotor(
        key: 'targetPosition' | 'targetVelocity' | 'stiffness' | 'damping' | 'maximumForce',
        value: number
    ) {
        if (!objectJoint || (objectJoint.type !== 'hinge' && objectJoint.type !== 'slider')) return;
        const motor = objectJoint.motor ?? {
            targetPosition: 0,
            targetVelocity: 0,
            stiffness: 10,
            damping: 1
        };
        updateJoint({ motor: { ...motor, [key]: number(value) } });
    }

    function validationErrors(definition: PhysicsDefinition, joint?: JointDefinition): string[] {
        const result: string[] = [];
        if (definition.bodyType === 'dynamic' && (!definition.massKg || definition.massKg <= 0))
            result.push('Dynamic bodies require a mass greater than zero.');
        if ((definition.friction ?? 0) < 0) result.push('Friction cannot be negative.');
        if ((definition.restitution ?? 0) < 0 || (definition.restitution ?? 0) > 1)
            result.push('Restitution must be between 0 and 1.');
        if (!definition.autoCollider && definition.colliders.length === 0)
            result.push('Add a collider or enable automatic collider generation.');
        definition.colliders.forEach((collider, index) => {
            const valid =
                collider.shape === 'box'
                    ? collider.sizeMm.x > 0 && collider.sizeMm.y > 0 && collider.sizeMm.z > 0
                    : collider.shape === 'trimesh'
                      ? collider.verticesMm.length >= 9 && collider.indices.length >= 3
                      : collider.radiusMm > 0 && collider.heightMm > 0;
            if (!valid) result.push(`Collider ${index + 1} dimensions must be greater than zero.`);
        });
        if (joint) {
            const limits =
                joint.type === 'hinge'
                    ? joint.limitsRadians
                    : joint.type === 'slider'
                      ? joint.limitsMm
                      : undefined;
            if (limits && limits.min > limits.max)
                result.push('Joint minimum cannot exceed maximum.');
            if (joint.parentId === joint.childId)
                result.push('A joint cannot connect an object to itself.');
            if (joint.type === 'latch' && joint.releaseForceN <= 0)
                result.push('Latch release force must be greater than zero.');
            if (joint.type !== 'latch' && joint.breakForceN !== undefined && joint.breakForceN <= 0)
                result.push('Break force must be greater than zero.');
        }
        return result;
    }

    function availableParents(): { id: string; name: string }[] {
        return [
            { id: '#world', name: 'World' },
            ...objects
                .filter((candidate) => candidate.id && candidate.id !== object.id)
                .map((candidate) => ({ id: candidate.id!, name: candidate.name }))
        ];
    }
</script>

<div
    class="w-[360px] max-h-[68dvh] overflow-y-auto rounded bg-white/95 p-3 shadow flex flex-col gap-3 text-sm"
>
    <div class="font-semibold">Physics: {object.name}</div>

    <label class="flex flex-col gap-1">
        <span>Body type</span>
        <select class="rounded border p-1" value={physics.bodyType} on:change={bodyTypeFromInput}>
            {#each bodyTypes as type}
                <option value={type.value}>{type.label}</option>
            {/each}
        </select>
    </label>

    <div class="grid grid-cols-2 gap-2">
        {#if physics.bodyType === 'dynamic'}
            <label
                >Mass (kg)<input
                    class="w-full rounded border p-1"
                    type="number"
                    min="0.001"
                    step="0.01"
                    value={physics.massKg ?? 0.1}
                    on:change={(event) => setNumber('massKg', event.currentTarget.valueAsNumber)}
                /></label
            >
        {/if}
        <label
            >Friction<input
                class="w-full rounded border p-1"
                type="number"
                min="0"
                step="0.05"
                value={physics.friction ?? 0.7}
                on:change={(event) => setNumber('friction', event.currentTarget.valueAsNumber)}
            /></label
        >
        <label
            >Restitution<input
                class="w-full rounded border p-1"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={physics.restitution ?? 0}
                on:change={(event) => setNumber('restitution', event.currentTarget.valueAsNumber)}
            /></label
        >
        <label
            >Linear damping<input
                class="w-full rounded border p-1"
                type="number"
                min="0"
                step="0.05"
                value={physics.linearDamping ?? 0}
                on:change={(event) => setNumber('linearDamping', event.currentTarget.valueAsNumber)}
            /></label
        >
        <label
            >Angular damping<input
                class="w-full rounded border p-1"
                type="number"
                min="0"
                step="0.05"
                value={physics.angularDamping ?? 0}
                on:change={(event) =>
                    setNumber('angularDamping', event.currentTarget.valueAsNumber)}
            /></label
        >
        <label
            >Collision group<input
                class="w-full rounded border p-1"
                type="number"
                min="0"
                step="1"
                value={physics.collisionGroup ?? 1}
                on:change={(event) =>
                    setNumber('collisionGroup', event.currentTarget.valueAsNumber)}
            /></label
        >
        <label
            >Collision mask<input
                class="w-full rounded border p-1"
                type="number"
                min="0"
                step="1"
                value={physics.collisionMask ?? 65535}
                on:change={(event) => setNumber('collisionMask', event.currentTarget.valueAsNumber)}
            /></label
        >
    </div>

    <div class="flex gap-3">
        <label
            ><input
                type="checkbox"
                checked={physics.autoCollider === true}
                on:change={(event) => setBoolean('autoCollider', event.currentTarget.checked)}
            /> Auto collider</label
        >
        <label
            ><input
                type="checkbox"
                checked={physics.continuousCollisionDetection === true}
                on:change={(event) =>
                    setBoolean('continuousCollisionDetection', event.currentTarget.checked)}
            /> CCD</label
        >
    </div>

    <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
        <span>Move</span><span
            >{#each axes as axis}<label class="mr-2 uppercase"
                    ><input
                        type="checkbox"
                        checked={physics.enabledTranslations?.[axis] !== false}
                        on:change={(event) =>
                            setMotionLock('enabledTranslations', axis, event.currentTarget.checked)}
                    />
                    {axis}</label
                >{/each}</span
        >
        <span>Rotate</span><span
            >{#each axes as axis}<label class="mr-2 uppercase"
                    ><input
                        type="checkbox"
                        checked={physics.enabledRotations?.[axis] !== false}
                        on:change={(event) =>
                            setMotionLock('enabledRotations', axis, event.currentTarget.checked)}
                    />
                    {axis}</label
                >{/each}</span
        >
    </div>

    <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
            <span class="font-semibold">Colliders</span><span class="flex gap-1"
                >{#each colliderShapes as shape}<button
                        class="rounded bg-gray-200 px-2 py-1"
                        on:click={() => addCollider(shape)}>+ {shape}</button
                    >{/each}</span
            >
        </div>
        {#each physics.colliders as collider, index}
            <div class="rounded border p-2 flex flex-col gap-2">
                <div class="flex justify-between">
                    <span class="font-medium capitalize">{index + 1}. {collider.shape}</span><button
                        class="text-red-700"
                        on:click={() => removeCollider(index)}>Remove</button
                    >
                </div>
                {#if collider.shape === 'box'}
                    <div class="grid grid-cols-3 gap-1">
                        {#each axes as axis}<label class="uppercase"
                                >Size {axis}<input
                                    class="w-full rounded border p-1"
                                    type="number"
                                    min="0.1"
                                    value={collider.sizeMm[axis]}
                                    on:change={(event) =>
                                        updateColliderVector(
                                            index,
                                            'sizeMm',
                                            axis,
                                            event.currentTarget.valueAsNumber
                                        )}
                                /></label
                            >{/each}
                    </div>
                {:else if collider.shape === 'cylinder' || collider.shape === 'capsule'}
                    <div class="grid grid-cols-2 gap-1">
                        <label
                            >Radius<input
                                class="w-full rounded border p-1"
                                type="number"
                                min="0.1"
                                value={collider.radiusMm}
                                on:change={(event) =>
                                    updateCollider(index, {
                                        radiusMm: event.currentTarget.valueAsNumber
                                    })}
                            /></label
                        ><label
                            >Height<input
                                class="w-full rounded border p-1"
                                type="number"
                                min="0.1"
                                value={collider.heightMm}
                                on:change={(event) =>
                                    updateCollider(index, {
                                        heightMm: event.currentTarget.valueAsNumber
                                    })}
                            /></label
                        >
                    </div>
                {:else}
                    <p class="text-xs text-gray-500">
                        Generated triangle mesh ({Math.floor(collider.indices.length / 3)}
                        triangles). Edit the source model to change it.
                    </p>
                {/if}
                <div class="grid grid-cols-3 gap-1">
                    {#each axes as axis}<label class="uppercase"
                            >Offset {axis}<input
                                class="w-full rounded border p-1"
                                type="number"
                                value={collider.positionMm?.[axis] ?? 0}
                                on:change={(event) =>
                                    updateColliderVector(
                                        index,
                                        'positionMm',
                                        axis,
                                        event.currentTarget.valueAsNumber
                                    )}
                            /></label
                        >{/each}
                </div>
                <div>
                    <span>Local rotation quaternion</span>
                    <div class="grid grid-cols-4 gap-1">
                        {#each quaternionComponents as component}
                            <label class="uppercase"
                                >{component}<input
                                    class="w-full rounded border p-1"
                                    type="number"
                                    step="0.01"
                                    value={collider.rotation?.[component] ??
                                        (component === 'w' ? 1 : 0)}
                                    on:change={(event) =>
                                        updateColliderRotation(
                                            index,
                                            component,
                                            event.currentTarget.valueAsNumber
                                        )}
                                /></label
                            >
                        {/each}
                    </div>
                </div>
                <label
                    ><input
                        type="checkbox"
                        checked={collider.collisionEnabled !== false}
                        on:change={(event) =>
                            updateCollider(index, {
                                collisionEnabled: event.currentTarget.checked
                            })}
                    /> Solid collision</label
                >
            </div>
        {/each}
    </div>

    <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
            <span class="font-semibold">Joint</span>{#if objectJoint}<button
                    class="text-red-700"
                    on:click={removeJoint}>Remove</button
                >{:else}<span class="flex gap-1"
                    ><button
                        class="rounded bg-gray-200 px-2 py-1"
                        on:click={() => addJoint('hinge')}>+ hinge</button
                    ><button
                        class="rounded bg-gray-200 px-2 py-1"
                        on:click={() => addJoint('slider')}>+ slider</button
                    ><button
                        class="rounded bg-gray-200 px-2 py-1"
                        on:click={() => addJoint('fixed')}>+ fixed</button
                    ><button
                        class="rounded bg-gray-200 px-2 py-1"
                        on:click={() => addJoint('spring')}>+ spring</button
                    ><button
                        class="rounded bg-gray-200 px-2 py-1"
                        on:click={() => addJoint('latch')}>+ latch</button
                    ></span
                >{/if}
        </div>
        {#if objectJoint}
            <div class="grid grid-cols-2 gap-2">
                <label
                    >Type<select
                        class="w-full rounded border p-1"
                        value={objectJoint.type}
                        on:change={jointTypeFromInput}
                        ><option value="hinge">Hinge</option><option value="slider">Slider</option
                        ><option value="fixed">Fixed</option><option value="spring">Spring</option
                        ><option value="latch">Latch</option></select
                    ></label
                >
                <label
                    >Parent<select
                        class="w-full rounded border p-1"
                        value={objectJoint.parentId}
                        on:change={(event) => updateJoint({ parentId: event.currentTarget.value })}
                        >{#each availableParents() as parent}<option value={parent.id}
                                >{parent.name} ({parent.id})</option
                            >{/each}</select
                    ></label
                >
                <label
                    >Axis<select
                        class="w-full rounded border p-1 uppercase"
                        value={objectJoint.axis}
                        on:change={jointAxisFromInput}
                        >{#each axes as axis}<option value={axis}>{axis}</option>{/each}</select
                    ></label
                >
            </div>
            <div>
                <span>Parent anchor (mm)</span>
                <div class="grid grid-cols-3 gap-1">
                    {#each axes as axis}<label class="uppercase"
                            >{axis}<input
                                class="w-full rounded border p-1"
                                type="number"
                                value={objectJoint.parentAnchorMm[axis]}
                                on:change={(event) =>
                                    updateJointVector(
                                        'parentAnchorMm',
                                        axis,
                                        event.currentTarget.valueAsNumber
                                    )}
                            /></label
                        >{/each}
                </div>
            </div>
            <div>
                <span>Child anchor (mm)</span>
                <div class="grid grid-cols-3 gap-1">
                    {#each axes as axis}<label class="uppercase"
                            >{axis}<input
                                class="w-full rounded border p-1"
                                type="number"
                                value={objectJoint.childAnchorMm[axis]}
                                on:change={(event) =>
                                    updateJointVector(
                                        'childAnchorMm',
                                        axis,
                                        event.currentTarget.valueAsNumber
                                    )}
                            /></label
                        >{/each}
                </div>
            </div>
            {#if objectJoint.type === 'hinge'}
                <div class="grid grid-cols-2 gap-1">
                    <label
                        >Min (degrees)<input
                            class="w-full rounded border p-1"
                            type="number"
                            value={((objectJoint.limitsRadians?.min ?? -Math.PI) * 180) / Math.PI}
                            on:change={(event) =>
                                updateJoint({
                                    limitsRadians: {
                                        min: (event.currentTarget.valueAsNumber * Math.PI) / 180,
                                        max:
                                            objectJoint?.type === 'hinge'
                                                ? (objectJoint.limitsRadians?.max ?? Math.PI)
                                                : Math.PI
                                    }
                                })}
                        /></label
                    ><label
                        >Max (degrees)<input
                            class="w-full rounded border p-1"
                            type="number"
                            value={((objectJoint.limitsRadians?.max ?? Math.PI) * 180) / Math.PI}
                            on:change={(event) =>
                                updateJoint({
                                    limitsRadians: {
                                        min:
                                            objectJoint?.type === 'hinge'
                                                ? (objectJoint.limitsRadians?.min ?? -Math.PI)
                                                : -Math.PI,
                                        max: (event.currentTarget.valueAsNumber * Math.PI) / 180
                                    }
                                })}
                        /></label
                    >
                </div>
            {:else if objectJoint.type === 'slider'}
                <div class="grid grid-cols-2 gap-1">
                    <label
                        >Min (mm)<input
                            class="w-full rounded border p-1"
                            type="number"
                            value={objectJoint.limitsMm.min}
                            on:change={(event) =>
                                updateJoint({
                                    limitsMm: {
                                        min: event.currentTarget.valueAsNumber,
                                        max:
                                            objectJoint?.type === 'slider'
                                                ? objectJoint.limitsMm.max
                                                : 0
                                    }
                                })}
                        /></label
                    ><label
                        >Max (mm)<input
                            class="w-full rounded border p-1"
                            type="number"
                            value={objectJoint.limitsMm.max}
                            on:change={(event) =>
                                updateJoint({
                                    limitsMm: {
                                        min:
                                            objectJoint?.type === 'slider'
                                                ? objectJoint.limitsMm.min
                                                : 0,
                                        max: event.currentTarget.valueAsNumber
                                    }
                                })}
                        /></label
                    >
                </div>
            {:else if objectJoint.type === 'spring'}
                <div class="grid grid-cols-3 gap-1">
                    <label
                        >Rest length (mm)<input
                            class="w-full rounded border p-1"
                            type="number"
                            min="0"
                            value={objectJoint.restLengthMm}
                            on:change={(event) =>
                                updateJoint({ restLengthMm: event.currentTarget.valueAsNumber })}
                        /></label
                    >
                    <label
                        >Stiffness<input
                            class="w-full rounded border p-1"
                            type="number"
                            min="0"
                            value={objectJoint.stiffness}
                            on:change={(event) =>
                                updateJoint({ stiffness: event.currentTarget.valueAsNumber })}
                        /></label
                    >
                    <label
                        >Damping<input
                            class="w-full rounded border p-1"
                            type="number"
                            min="0"
                            value={objectJoint.damping}
                            on:change={(event) =>
                                updateJoint({ damping: event.currentTarget.valueAsNumber })}
                        /></label
                    >
                </div>
            {:else if objectJoint.type === 'latch'}
                <label
                    >Release force (N)<input
                        class="w-full rounded border p-1"
                        type="number"
                        min="0.01"
                        value={objectJoint.releaseForceN}
                        on:change={(event) =>
                            updateJoint({ releaseForceN: event.currentTarget.valueAsNumber })}
                    /></label
                >
            {/if}
            {#if objectJoint.type === 'hinge' || objectJoint.type === 'slider'}
                <div class="flex flex-col gap-1 rounded border p-2">
                    <label
                        ><input
                            type="checkbox"
                            checked={objectJoint.motor !== undefined}
                            on:change={(event) => setJointMotorEnabled(event.currentTarget.checked)}
                        /> Motorized</label
                    >
                    {#if objectJoint.motor}
                        <div class="grid grid-cols-3 gap-1">
                            <label
                                >Target {objectJoint.type === 'hinge' ? '(rad)' : '(mm)'}<input
                                    class="w-full rounded border p-1"
                                    type="number"
                                    value={objectJoint.motor.targetPosition}
                                    on:change={(event) =>
                                        updateJointMotor(
                                            'targetPosition',
                                            event.currentTarget.valueAsNumber
                                        )}
                                /></label
                            >
                            <label
                                >Velocity {objectJoint.type === 'hinge'
                                    ? '(rad/s)'
                                    : '(mm/s)'}<input
                                    class="w-full rounded border p-1"
                                    type="number"
                                    value={objectJoint.motor.targetVelocity ?? 0}
                                    on:change={(event) =>
                                        updateJointMotor(
                                            'targetVelocity',
                                            event.currentTarget.valueAsNumber
                                        )}
                                /></label
                            >
                            <label
                                >Max force<input
                                    class="w-full rounded border p-1"
                                    type="number"
                                    min="0"
                                    value={objectJoint.motor.maximumForce ?? 10}
                                    on:change={(event) =>
                                        updateJointMotor(
                                            'maximumForce',
                                            event.currentTarget.valueAsNumber
                                        )}
                                /></label
                            >
                            <label
                                >Stiffness<input
                                    class="w-full rounded border p-1"
                                    type="number"
                                    min="0"
                                    value={objectJoint.motor.stiffness}
                                    on:change={(event) =>
                                        updateJointMotor(
                                            'stiffness',
                                            event.currentTarget.valueAsNumber
                                        )}
                                /></label
                            >
                            <label
                                >Damping<input
                                    class="w-full rounded border p-1"
                                    type="number"
                                    min="0"
                                    value={objectJoint.motor.damping}
                                    on:change={(event) =>
                                        updateJointMotor(
                                            'damping',
                                            event.currentTarget.valueAsNumber
                                        )}
                                /></label
                            >
                        </div>
                    {/if}
                </div>
            {/if}
            {#if objectJoint.type !== 'latch'}
                <label class="flex flex-col"
                    >Break force (N, blank = unbreakable)<input
                        class="w-full rounded border p-1"
                        type="number"
                        min="0.01"
                        placeholder="Unbreakable"
                        value={objectJoint.breakForceN ?? undefined}
                        on:change={(event) =>
                            updateJoint({
                                breakForceN:
                                    event.currentTarget.value === ''
                                        ? undefined
                                        : event.currentTarget.valueAsNumber
                            })}
                    /></label
                >
            {/if}
        {/if}
    </div>

    {#if errors.length}
        <ul class="rounded bg-red-50 p-2 text-red-800 list-disc list-inside">
            {#each errors as error}<li>{error}</li>{/each}
        </ul>
    {/if}
</div>
