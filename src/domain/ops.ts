import type { Costume, Layer, Project, SheetSettings, Sprite } from './types'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export function findCostume(
  project: Project,
  spriteId: string,
  costumeId: string,
): { sprite: Sprite; costume: Costume } | undefined {
  const sprite = project.sprites.find((s) => s.id === spriteId)
  const costume = sprite?.costumes.find((c) => c.id === costumeId)
  return sprite && costume ? { sprite, costume } : undefined
}

export function updateSprite(
  project: Project,
  spriteId: string,
  fn: (sprite: Sprite) => Sprite,
): Project {
  if (!project.sprites.some((s) => s.id === spriteId)) {
    throw new Error(`スプライトが見つかりません: ${spriteId}`)
  }
  return {
    ...project,
    sprites: project.sprites.map((s) => (s.id === spriteId ? fn(s) : s)),
  }
}

export function updateCostume(
  project: Project,
  spriteId: string,
  costumeId: string,
  fn: (costume: Costume) => Costume,
): Project {
  if (!findCostume(project, spriteId, costumeId)) {
    throw new Error(`コスチュームが見つかりません: ${costumeId}`)
  }
  return updateSprite(project, spriteId, (s) => ({
    ...s,
    costumes: s.costumes.map((c) => (c.id === costumeId ? fn(c) : c)),
  }))
}

export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const inRange = (i: number) =>
    Number.isInteger(i) && i >= 0 && i < items.length
  if (!inRange(from) || !inRange(to)) return [...items]
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

export const addLayer = (
  p: Project,
  spriteId: string,
  costumeId: string,
  layer: Layer,
) =>
  updateCostume(p, spriteId, costumeId, (c) => ({
    ...c,
    layers: [...c.layers, layer],
  }))

export function removeLayer(
  project: Project,
  spriteId: string,
  costumeId: string,
  layerId: string,
): Project {
  return updateCostume(project, spriteId, costumeId, (c) => {
    if (c.layers.length <= 1) throw new Error('最後のレイヤーは削除できません')
    return { ...c, layers: c.layers.filter((l) => l.id !== layerId) }
  })
}

export function setLayerProps(
  project: Project,
  spriteId: string,
  costumeId: string,
  layerId: string,
  props: Partial<Pick<Layer, 'name' | 'visible' | 'locked' | 'opacity'>>,
): Project {
  const safe =
    props.opacity === undefined
      ? props
      : { ...props, opacity: clamp(props.opacity, 0, 1) }
  return updateCostume(project, spriteId, costumeId, (c) => ({
    ...c,
    layers: c.layers.map((l) => (l.id === layerId ? { ...l, ...safe } : l)),
  }))
}

export const renameSprite = (p: Project, spriteId: string, name: string) =>
  updateSprite(p, spriteId, (s) => ({ ...s, name }))

export const renameCostume = (
  p: Project,
  spriteId: string,
  costumeId: string,
  name: string,
) => updateCostume(p, spriteId, costumeId, (c) => ({ ...c, name }))

export const removeSprite = (p: Project, spriteId: string): Project => ({
  ...p,
  sprites: p.sprites.filter((s) => s.id !== spriteId),
})

export const removeCostume = (
  p: Project,
  spriteId: string,
  costumeId: string,
) =>
  updateSprite(p, spriteId, (s) => ({
    ...s,
    costumes: s.costumes.filter((c) => c.id !== costumeId),
  }))

export const setSheetSettings = (
  p: Project,
  spriteId: string,
  sheet: SheetSettings,
) =>
  updateSprite(p, spriteId, (s) => ({
    ...s,
    sheet: {
      columns: clamp(Math.round(sheet.columns), 1, 256),
      padding: clamp(Math.round(sheet.padding), 0, 64),
      fps: clamp(sheet.fps, 1, 60),
    },
  }))
