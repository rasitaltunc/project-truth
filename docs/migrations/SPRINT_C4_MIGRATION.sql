-- ═══════════════════════════════════════════════════════
-- SECURITY SPRINT C4: Self-Review Prevention
-- Problem: Scanner can review their own quarantine items
-- Fix: Add submitted_by column to data_quarantine table
-- ═══════════════════════════════════════════════════════

-- Add submitted_by column to track who scanned/submitted each quarantine item
-- This enables self-review prevention even when documents.scanned_by is NULL
ALTER TABLE data_quarantine
  ADD COLUMN IF NOT EXISTS submitted_by TEXT;

-- Index for efficient self-review lookups
CREATE INDEX IF NOT EXISTS idx_data_quarantine_submitted_by
  ON data_quarantine(submitted_by);

-- Backfill: Copy scanned_by from documents table for existing items
UPDATE data_quarantine q
SET submitted_by = d.scanned_by
FROM documents d
WHERE q.document_id = d.id
  AND q.submitted_by IS NULL
  AND d.scanned_by IS NOT NULL;
