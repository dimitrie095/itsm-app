@echo off
echo ========================================
echo ITSM Application - Secure Migration Tool
echo ========================================
echo.
echo WARNING: This script migrates data between databases.
echo Ensure you have proper backups before proceeding.
echo.
set /p confirm="Type 'YES' to continue: "
if not "%confirm%"=="YES" (
    echo Migration cancelled.
    exit /b 0
)

echo.
echo Running data migration from SQLite to PostgreSQL...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    exit /b 1
)

REM Check if itsm.db exists
if not exist "itsm.db" (
    echo Error: SQLite database file 'itsm.db' not found.
    exit /b 1
)

REM Check for environment variables
if "%DATABASE_URL%"=="" (
    echo Warning: DATABASE_URL environment variable is not set.
    echo Using default PostgreSQL connection.
)

REM Create backup before migration
echo Creating backup of SQLite database...
copy "itsm.db" "itsm.db.backup.%date:~-4,4%%date:~-7,2%%date:~-10,2%.%time:~0,2%%time:~3,2%"
if %ERRORLEVEL% equ 0 (
    echo Backup created successfully.
) else (
    echo Warning: Could not create backup.
)

REM Run the migration script
echo.
echo Starting data migration...
node ../js/migrate-data.js

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo Data migration completed successfully!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Verify data in PostgreSQL database
    echo 2. Update DATABASE_URL in .env.local
    echo 3. Run 'npm run prisma:generate'
    echo 4. Test the application
) else (
    echo.
    echo ========================================
    echo Data migration failed!
    echo ========================================
    echo.
    echo Check the error messages above.
    echo If needed, restore from backup.
    exit /b 1
)