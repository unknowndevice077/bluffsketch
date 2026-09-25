export type PlayerPattern =
  | 'solid'
  | 'dots'
  | 'stripes'
  | 'checks'
  | 'zigzag'
  | 'cross'
  | 'rings'
  | 'triangles'
  | 'waves'
  | 'grid';

export interface PlayerColor {
  hex: string;
  name: string;
  pattern: PlayerPattern;
}

/**
 * Ten colours built from the Okabe-Ito and Tol palettes, the best-known
 * colourblind-safe sets. Ten hues can never all be told apart by every viewer,
 * so each player also gets a number and a pattern badge.
 */
export const PLAYER_COLORS: readonly PlayerColor[] = [
  { hex: '#0072B2', name: 'Blue', pattern: 'solid' },
  { hex: '#E69F00', name: 'Orange', pattern: 'dots' },
  { hex: '#009E73', name: 'Green', pattern: 'stripes' },
  { hex: '#D55E00', name: 'Vermilion', pattern: 'checks' },
  { hex: '#56B4E9', name: 'Sky', pattern: 'zigzag' },
  { hex: '#CC79A7', name: 'Pink', pattern: 'cross' },
  { hex: '#882255', name: 'Wine', pattern: 'rings' },
  { hex: '#999933', name: 'Olive', pattern: 'triangles' },
  { hex: '#332288', name: 'Indigo', pattern: 'waves' },
  { hex: '#4A4A4A', name: 'Charcoal', pattern: 'grid' },
];

export function colorOf(index: number): PlayerColor {
  return PLAYER_COLORS[((index % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}
