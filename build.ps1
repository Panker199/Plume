$env:JAVA_HOME = "C:\Users\munee\AppData\Local\Temp\jdk21\jdk-21.0.2"
$env:ANDROID_HOME = "C:\Users\munee\AppData\Local\Temp\android-sdk"

Set-Location "D:\Plume Code\frontend\android"
& ".\gradlew.bat" assembleDebug
