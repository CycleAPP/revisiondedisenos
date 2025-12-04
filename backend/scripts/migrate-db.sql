-- Complete Database Migration Script
-- This fixes all enum type mismatches

-- 1. Rename AssignmentStatus to Status (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssignmentStatus') THEN
        ALTER TYPE "AssignmentStatus" RENAME TO "Status";
        RAISE NOTICE 'Renamed AssignmentStatus to Status';
    END IF;
END$$;

-- 2. Create Status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Status') THEN
        CREATE TYPE "Status" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'APPROVED', 'REJECTED');
        RAISE NOTICE 'Created Status enum';
    END IF;
END$$;

-- 3. Create Role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('ADMIN', 'LEADER', 'DESIGNER');
        RAISE NOTICE 'Created Role enum';
    END IF;
END$$;

-- 4. Create FileType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FileType') THEN
        CREATE TYPE "FileType" AS ENUM ('EXCEL', 'DESIGN');
        RAISE NOTICE 'Created FileType enum';
    END IF;
END$$;
