@echo off
echo Starting Media Downloader...

:: Start the Express server
start cmd /k "cd /d %~dp0 && npm run server"

:: Wait for the server to start
timeout /t 3

:: Start the Vite development server
start cmd /k "cd /d %~dp0 && npm run dev"

:: Wait for the Vite server to start
timeout /t 5

:: Open the browser
start http://localhost:5175

echo Media Downloader is now running!
