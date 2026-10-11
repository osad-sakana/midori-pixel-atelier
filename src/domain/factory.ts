import { CURRENT_SCHEMA_VERSION } from './schema'
import type { Costume, Layer, Project, Sprite } from './types'

export const newId = (): string => crypto.randomUUID()

export function createRasterLayer(name = 'レイヤー1'): Layer {
  return {
    type: 'raster',
    id: newId(),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    assetId: newId(),
  }
}

export function createCostume(params: {
  name: string
  width: number
  height: number
}): Costume {
  const { name, width, height } = params
  return {
    id: newId(),
    name,
    width,
    height,
    pivot: { x: width / 2, y: height / 2 },
    antialias: false,
    layers: [createRasterLayer()],
  }
}

export function createSprite(name: string): Sprite {
  return { id: newId(), name, costumes: [] }
}

export function createProject(name: string): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: newId(),
    name,
    sprites: [],
  }
}

export function addSprite(project: Project, sprite: Sprite): Project {
  return { ...project, sprites: [...project.sprites, sprite] }
}

export function addCostume(
  project: Project,
  spriteId: string,
  costume: Costume,
): Project {
  if (!project.sprites.some((s) => s.id === spriteId)) {
    throw new Error(`スプライトが見つかりません: ${spriteId}`)
  }
  return {
    ...project,
    sprites: project.sprites.map((s) =>
      s.id === spriteId ? { ...s, costumes: [...s.costumes, costume] } : s,
    ),
  }
}
