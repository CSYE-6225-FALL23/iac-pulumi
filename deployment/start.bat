@echo off
rem Get the absolute path to the directory containing the batch script
set script_directory=%~dp0

rem Set the Node.js script path relative to the root directory
set node_script=%script_directory%\..\server\index.js

rem Check if the Node.js script exists
if exist "%node_script%" (
  cd %script_directory%\..\deployment && docker-compose up -d
  cd %script_directory%\..\database && npm i
  cd %script_directory%\..\server && npm i && npm start
) else (
  echo Node.js script not found: %node_script%
  exit /b 1
)
