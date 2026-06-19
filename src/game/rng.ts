export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickIndex(seed: string, counter: number, length: number): number {
  if (length <= 0) {
    throw new Error("Cannot pick from an empty collection");
  }

  const value = Math.imul(hashSeed(seed) ^ counter, 2654435761) >>> 0;
  return value % length;
}
