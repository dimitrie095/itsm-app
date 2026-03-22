@echo off
echo Testing PostgreSQL connection...

REM Check if DATABASE_URL is set
if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL environment variable is not set.
    exit /b 1
)

echo DATABASE_URL is set.

REM Try to connect using psql if available
where psql >nul 2>nul
if %errorlevel% equ 0 (
    echo Using psql to test connection...
    psql "%DATABASE_URL%" -c "SELECT 1;" >nul 2>nul
    if %errorlevel% equ 0 (
        echo SUCCESS: PostgreSQL connection test passed.
        exit /b 0
    ) else (
        echo ERROR: PostgreSQL connection test failed with psql.
    )
)

REM Fallback to using Prisma CLI
echo Trying Prisma CLI...
npx prisma db execute --file ../../db/test_postgresql.sql >nul 2>nul
if %errorlevel% equ 0 (
    echo SUCCESS: PostgreSQL connection test passed via Prisma.
    exit /b 0
) else (
    echo ERROR: PostgreSQL connection test failed via Prisma.
    echo.
    echo Troubleshooting steps:
    echo 1. Ensure PostgreSQL is running on localhost:5432
    echo 2. Verify the username and password in DATABASE_URL are correct
    echo 3. Check if the database 'itsm' exists
    echo 4. Ensure the PostgreSQL user has access to the database
    exit /b 1
)