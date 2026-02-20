@echo off
setlocal

:: ============================================================================
:: AUTOMATED PROJECT BACKUP SCRIPT
:: ============================================================================
:: Description: Backs up the full-stack project using Robocopy
:: Source:      D:\final\cloud-space
:: Destination: E:\backup\cloud-space
:: Exclusions:  node_modules, .git, dist, *.log
:: Features:    Progress bar, Logging, Restartable mode
:: ============================================================================

:: 1. DEFINE VARIABLES
:: Automatically set Source to the directory where this script is located
set "SOURCE=%~dp0"
:: Remove trailing backslash to prevent quote escaping issues
if "%SOURCE:~-1%"=="\" set "SOURCE=%SOURCE:~0,-1%"

set "DEST=E:\backup\end last"
set "LOG_FILE=E:\backup\backup_log.txt"
set "TIMESTAMP=%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%"

:: 2. SETUP DESTINATION
echo.
echo [INFO] Preparing backup...
echo [INFO] Source: %SOURCE%
echo [INFO] Dest:   %DEST%
echo.

if not exist "%DEST%" (
    echo [INFO] Creating destination folder...
    mkdir "%DEST%"
)

:: Create folder for log file if it doesn't exist
if not exist "E:\backup" (
    mkdir "E:\backup"
)

:: 3. RUN ROBOCOPY
:: Options Explanation:
:: /E       :: Copy subdirectories, including empty ones.
:: /Z       :: Copy files in restartable mode.
:: /ZB      :: Use restartable mode; if access denied, use Backup mode.
:: /R:3     :: Param to limit retries to 3 times on failed copies.
:: /W:5     :: Param to wait 5 seconds between retries.
:: /MT:16   :: Do multi-threaded copies with n threads (faster).
:: /XD      :: Exclude Directories matching valid names/paths.
:: /XF      :: Exclude Files matching valid names/paths.
:: /LOG+    :: Output status to LOG file (append to existing).
:: /TEE     :: Output to console window, as well as the log file.

echo [INFO] Starting backup process...
echo.

robocopy "%SOURCE%" "%DEST%" /E /DCOPY:T /COPY:DAT /R:3 /W:5 /MT:16 ^
    /XD "node_modules" ".git" "dist" ".angular" ^
    /XF "*.log" "*.tmp" "thumbs.db" ^
    /LOG+:"%LOG_FILE%" /TEE

:: 4. CHECK STATUS
:: Robocopy Exit Codes:
:: 0 = No errors occurred, and no copying was done.
:: 1 = One or more files were copied successfully.
:: 2 = Extra files or directories were detected (only with /MIR).
:: 4 = Mismatched files or directories were detected.
:: 8 = Some copies failed.
:: 16 = Serious error.

if %ERRORLEVEL% LEQ 7 (
    echo.
    echo ========================================================
    echo [SUCCESS] Backup completed successfully!
    echo [INFO] Log saved to: %LOG_FILE%
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [ERROR] Backup completed with errors! (Code: %ERRORLEVEL%)
    echo [INFO] Please check the log file: %LOG_FILE%
    echo ========================================================
)

echo.
pause
