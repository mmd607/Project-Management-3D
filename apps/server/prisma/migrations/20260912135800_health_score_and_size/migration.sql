-- Replace the ad-hoc JSON `sizeSummary` column with typed fields, so scanned size and
-- truncation are real queryable data instead of opaque JSON.
ALTER TABLE "ScanResult" ADD COLUMN "totalSizeBytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScanResult" ADD COLUMN "truncated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ScanResult" DROP COLUMN "sizeSummary";
