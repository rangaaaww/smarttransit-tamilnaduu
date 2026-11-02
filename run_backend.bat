@echo off
title SmartTransit Pro - Java REST API Backend (:8080)
echo ======================================================================
echo   SMARTTRANSIT PRO: COMPILING & STARTING JAVA REST BACKEND (:8080)
echo   Dept of Computer Science & Engineering | Easwari Engineering College
echo ======================================================================
if not exist "bin" mkdir bin
javac -d bin backend/src/smarttransit/SmartTransitServer.java
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backend compiled cleanly.
    echo Starting HTTP REST Server on http://localhost:8080...
    java -cp bin smarttransit.SmartTransitServer
) else (
    echo [ERROR] Compilation failed. Please make sure JDK is installed.
    pause
)