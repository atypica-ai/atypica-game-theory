/**
 * Distribute personaIds into groups of roughly `targetSize`.
 *
 * Algorithm: numGroups = ceil(N / targetSize). The first (N % numGroups) groups
 * get (baseSize + 1) players; the rest get baseSize. Groups are formed from a
 * randomly shuffled copy of the input so assignment is fair.
 *
 * For the tournament's three stages:
 *   Stage 1: N=100, targetSize=10 → 10 groups of 10
 *   Stage 2: N≈20, targetSize=5  → 4 groups of 5 (or similar near-even split)
 *   Stage 3: single group        → pass targetSize=Infinity or use [personaIds]
 */
export function distributeIntoGroups(personaIds: number[], targetSize: number): number[][] {
  const n = personaIds.length;
  if (n === 0) return [];
  if (targetSize >= n) return [[...personaIds]]; // single group

  const numGroups = Math.ceil(n / targetSize);
  const baseSize = Math.floor(n / numGroups);
  const extras = n % numGroups; // first `extras` groups get one extra player

  // Shuffle for random, unbiased group assignment
  const shuffled = shuffle([...personaIds]);

  const groups: number[][] = [];
  let i = 0;
  for (let g = 0; g < numGroups; g++) {
    const size = g < extras ? baseSize + 1 : baseSize;
    groups.push(shuffled.slice(i, i + size));
    i += size;
  }
  return groups;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
