import { getRef } from "@/core/utils";
import { sendClientOptions } from "@/game/api/utils";
import { ServerShape } from "@/game/comm/types/shapes";
import { GlobalPoint } from "@/game/geom";
import { layerManager } from "@/game/layers/manager";
import { createShapeFromDict } from "@/game/shapes/utils";
import { gameStore } from "@/game/store";
import { AnnotationManager } from "@/game/ui/annotation";
import { g2l } from "@/game/units";
import Initiative from "./ui/initiative.vue";
import { TriangulationTarget } from "./visibility/te/pa";

export class GameManager {
    selectedTool: number = 0;

    annotationManager = new AnnotationManager();

    addShape(shape: ServerShape): void {
        if (!layerManager.hasLayer(shape.layer)) {
            console.log(`Shape with unknown layer ${shape.layer} could not be added`);
            return;
        }
        const layer = layerManager.getLayer(shape.layer)!;
        const sh = createShapeFromDict(shape);
        if (sh === undefined) {
            console.log(`Shape with unknown type ${shape.type_} could not be added`);
            return;
        }
        layer.addShape(sh, false);
        layer.invalidate(false);
    }

    updateShape(data: { shape: ServerShape; redraw: boolean; move: boolean; temporary: boolean }): void {
        if (!layerManager.hasLayer(data.shape.layer)) {
            console.log(`Shape with unknown layer ${data.shape.layer} could not be added`);
            return;
        }
        const sh = createShapeFromDict(data.shape);
        if (sh === undefined) {
            console.log(`Shape with unknown type ${data.shape.type_} could not be added`);
            return;
        }
        const oldShape = layerManager.UUIDMap.get(data.shape.uuid);
        if (oldShape === undefined) {
            console.log(`Shape with unknown id could not be updated`);
            return;
        }
        const oldPoints = oldShape.points;
        const redrawInitiative = sh.owners !== oldShape.owners;
        const shape = Object.assign(oldShape, sh);
        const alteredVision = shape.checkVisionSources();
        const alteredMovement = shape.setMovementBlock(shape.movementObstruction);
        shape.setIsToken(shape.isToken);
        if (data.redraw) {
            if (shape.visionObstruction && !alteredVision) {
                gameStore.deleteFromTriag({ target: TriangulationTarget.VISION, shape: oldPoints, standalone: false });
                gameStore.addToTriag({ target: TriangulationTarget.VISION, points: shape.points });
            }
            layerManager.getLayer(data.shape.layer)!.invalidate(false);
            if (shape.movementObstruction && !alteredMovement) {
                gameStore.deleteFromTriag({
                    target: TriangulationTarget.MOVEMENT,
                    shape: oldPoints,
                    standalone: false,
                });
                gameStore.addToTriag({ target: TriangulationTarget.MOVEMENT, points: shape.points });
            }
        }
        if (redrawInitiative) getRef<Initiative>("initiative").$forceUpdate();
    }

    setCenterPosition(position: GlobalPoint) {
        const localPos = g2l(position);
        gameStore.increasePanX((window.innerWidth / 2 - localPos.x) / gameStore.zoomFactor);
        gameStore.increasePanY((window.innerHeight / 2 - localPos.y) / gameStore.zoomFactor);
        layerManager.invalidate();
        sendClientOptions();
    }
}

export const gameManager = new GameManager();
(<any>window).gameManager = gameManager;
