@echo off
cd /d D:\app\ziwei-doushu
if exist .next\BUILD_ID goto run
echo First run: building production bundle, please wait...
call npm run build
:run
echo Starting ziwei-doushu at http://localhost:3000
start "" http://localhost:3000/study
call npm run start
pause
