/**
 * Thrown when a token has not been registered in the container.
 */
export class NotRegisteredError extends Error {
  constructor(token: string) {
    super(
      `[NduloJS Container] Token "${token}" has not been registered.\n` +
        `Did you forget to call container.register("${token}", ...)?`,
    );
    this.name = 'NotRegisteredError';
  }
}

/**
 * Thrown when a circular dependency is detected during resolution.
 * Shows the full resolution chain so the developer can identify the cycle.
 */
export class CircularDependencyError extends Error {
  constructor(token: string, chain: string[]) {
    const cycleDisplay = [...chain, token].join(' → ');
    super(
      `[NduloJS Container] Circular dependency detected: ${cycleDisplay}\n` +
        `"${token}" depends on something that eventually depends on itself.`,
    );
    this.name = 'CircularDependencyError';
  }
}

/**
 * Thrown when trying to register the same token twice.
 */
export class AlreadyRegisteredError extends Error {
  constructor(token: string) {
    super(
      `[NduloJS Container] Token "${token}" is already registered.\n` +
        `If you want to override it, call container.reset() first.`,
    );
    this.name = 'AlreadyRegisteredError';
  }
}
