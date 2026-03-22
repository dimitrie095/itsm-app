-- SQL INSERT statements generated from SQLite database
-- Run this file with: psql -d itsm -U postgres -h localhost -p 5432 -f postgres-inserts.sql

BEGIN;

-- Table: custom_roles (1 rows)
INSERT INTO custom_roles (id, name, description, isActive, createdAt, updatedAt) VALUES ('31bd035d-a169-40a0-b4ac-0d94741c4ef9', 'IT_SUPPORT', 'IT Support role with permissions for dashboard, tickets, assets, knowledge base, users (read), analytics, reports, automation, and settings.', true, '2026-03-15T20:07:18.155+00:00', '2026-03-15T20:07:18.155+00:00');

