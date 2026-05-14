@echo off
rem Run development server with tsx while bypassing PowerShell execution policy
node -r tsx server.ts --watch --ignore data/** --ignore scratch/**
