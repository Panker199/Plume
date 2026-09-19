@echo off
set JAVA_HOME=C:\Users\munee\AppData\Local\Temp\jdk21\jdk-21.0.2
set ANDROID_HOME=C:\Users\munee\AppData\Local\Temp\android-sdk
set PATH=%JAVA_HOME%\bin;%PATH%

cd /d D:\Plume Code\frontend\android
call gradlew.bat assembleDebug
