export interface PhysicsSnapshot {
    world: Uint8Array;
    accumulatorSeconds: number;
}

export function copySnapshot(snapshot: PhysicsSnapshot): PhysicsSnapshot {
    return {
        world: snapshot.world.slice(),
        accumulatorSeconds: snapshot.accumulatorSeconds
    };
}
