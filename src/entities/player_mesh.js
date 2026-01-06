import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

import { PlayerModel } from './model/PlayerModel.js';

export function createPlayerMesh(customConfig = {}) {
    const model = new PlayerModel(customConfig);
    model.sync(customConfig);
    return { mesh: model.group, parts: model.parts, model: model };
}
