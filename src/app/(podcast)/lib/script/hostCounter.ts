import "server-only";

/**
 * Counts the number of unique hosts in a podcast script
 *
 * Hosts are identified by markers like 【Guy】, 【Ira】, 【凯】, 【艾拉】
 *
 * @param script - The podcast script with host markers
 * @returns The number of unique hosts found (0 if no markers)
 *
 * @example
 * countHosts("【Guy】Hello... 【Ira】Hi... 【Guy】Again") // Returns 2
 * countHosts("【Guy】Hello... 【Guy】Again") // Returns 1
 * countHosts("No markers here") // Returns 0
 */
export function countHosts(script: string): number {
  const hostMarkerRegex = /【([^】]+)】/g;
  const hosts = new Set<string>();

  let match;
  while ((match = hostMarkerRegex.exec(script)) !== null) {
    const hostName = match[1].trim();
    if (hostName) {
      hosts.add(hostName);
    }
  }

  return hosts.size;
}

/**
 * Gets the list of unique host names from a podcast script
 *
 * @param script - The podcast script with host markers
 * @returns Array of unique host names (empty if no markers)
 */
export function getHostNames(script: string): string[] {
  const hostMarkerRegex = /【([^】]+)】/g;
  const hosts = new Set<string>();

  let match;
  while ((match = hostMarkerRegex.exec(script)) !== null) {
    const hostName = match[1].trim();
    if (hostName) {
      hosts.add(hostName);
    }
  }

  return Array.from(hosts);
}
