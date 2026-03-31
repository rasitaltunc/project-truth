import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Node Server — E2E test ortamında API isteklerini yakalar.
 *
 * Bu sunucu Playwright global setup'ta başlatılır,
 * global teardown'da durdurulur.
 */
export const server = setupServer(...handlers);
