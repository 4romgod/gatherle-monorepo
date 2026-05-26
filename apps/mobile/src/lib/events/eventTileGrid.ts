export const PROFILE_EVENT_TILE_GRID_GAP = 6;

const THREE_COLUMN_GRID_BREAKPOINT = 520;

export function getProfileEventGridColumns(availableWidth: number) {
  return availableWidth >= THREE_COLUMN_GRID_BREAKPOINT ? 3 : 2;
}

export function getProfileEventTileSize(availableWidth: number, columns = getProfileEventGridColumns(availableWidth)) {
  return Math.floor((availableWidth - PROFILE_EVENT_TILE_GRID_GAP * (columns - 1)) / columns);
}
