@echo off
title VocabMaster - Samundramanthan 200
set APP_PATH=%~dp0index.html

echo Launching VocabMaster Desktop App...

:: Try launching with Microsoft Edge in App Mode (Standalone Window)
start msedge.exe --app="file:///%APP_PATH%"

:: Fallback if Edge is not default
if %ERRORLEVEL% NEQ 0 (
    start "" "%APP_PATH%"
)
exit
