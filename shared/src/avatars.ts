export const AVATAR_IDS = [
  'cat',
  'dog',
  'fox',
  'owl',
  'frog',
  'bear',
  'robot',
  'ghost',
  'alien',
  'penguin',
  'cactus',
  'octopus',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(value: string): value is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(value);
}
