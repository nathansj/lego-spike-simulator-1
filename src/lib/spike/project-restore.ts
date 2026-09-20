import type { Model } from '$lib/ldraw/components';
import type { ProjectArchiveProjectPayload } from '$lib/spike/project-archive';
import type { SceneObject, SceneStore } from '$lib/spike/scene';

export type ProjectModelLoader = (name: string, content: string) => Model;

function modelForObject(
    payload: ProjectArchiveProjectPayload,
    object: SceneObject
): ProjectArchiveProjectPayload['models'][number] | undefined {
    return payload.models.find(
        (model) =>
            model.objectId === object.id ||
            (object.id !== undefined && model.entry.endsWith(`/${object.id}.mpd`))
    );
}

export function sceneFromProjectPayload(
    payload: ProjectArchiveProjectPayload,
    robot: Model,
    map: Blob | undefined,
    loadModel: ProjectModelLoader
): SceneStore {
    const objects = payload.scene.objects.map((object) => {
        const model = modelForObject(payload, object);
        return {
            ...object,
            bricks: model ? loadModel(object.name, model.content) : undefined
        };
    });
    return {
        ...payload.scene,
        robot: {
            ...payload.scene.robot,
            bricks: robot
        },
        objects,
        map
    };
}
