@echo off
echo Installing CLIRDEC Auto RFID Service...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

REM Install required Python packages
echo Installing required packages...
pip install pyserial keyboard psutil requests win10toast pywin32

REM Create startup shortcut
echo Creating desktop shortcut...
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%USERPROFILE%\Desktop\CLIRDEC RFID Service.lnk" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "python" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Arguments = """%CD%\auto_rfid_service.py""" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%CD%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.IconLocation = "shell32.dll,21" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "CLIRDEC Auto RFID Service" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"
cscript "%TEMP%\CreateShortcut.vbs" >nul
del "%TEMP%\CreateShortcut.vbs"

REM Add to startup folder
echo Adding to Windows startup...
copy "%USERPROFILE%\Desktop\CLIRDEC RFID Service.lnk" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\" >nul

echo.
echo ================================
echo Installation Complete!
echo ================================
echo.
echo The RFID service has been set up:
echo 1. Desktop shortcut created
echo 2. Added to Windows startup
echo 3. Will auto-start with Windows
echo.
echo To start now, double-click the desktop shortcut
echo or run: python auto_rfid_service.py
echo.
pause