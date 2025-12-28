/**
 * Resolves the fetch implementation to use for Supabase requests
 */
export const resolveFetch = (customFetch?: typeof fetch): typeof fetch => {
  if (customFetch) {
    return customFetch;
  }

  if (typeof window !== 'undefined' && window.fetch) {
    return window.fetch.bind(window);
  }

  if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error('No fetch implementation found');
};