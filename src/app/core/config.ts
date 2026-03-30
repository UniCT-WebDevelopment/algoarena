const runtimeConfig = globalThis as unknown as { ALGO_ARENA_API?: string };

export const API_BASE_URL = runtimeConfig.ALGO_ARENA_API ?? 'http://localhost:3001/api';
