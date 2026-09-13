// Runs before the test suite (see vitest.config.ts setupFiles).
// Points the app at a dedicated, disposable test database — never the dev DB.
process.env.DATABASE_URL ??= "file:./test.db"; // relative to apps/server/prisma/
process.env.AI_PROVIDER = "mock";
// PORT is unused in tests (supertest calls the Express app directly, no listen()) —
// leave it unset so env.ts's positive-integer default applies.
