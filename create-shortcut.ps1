$WshShell = New-Object -ComObject WScript.Shell
$projectPath = (Get-Location).Path
$batchPath = Join-Path -Path $projectPath -ChildPath "start-media-downloader.bat"
$shortcutPath = Join-Path -Path $projectPath -ChildPath "Media Downloader.lnk"

$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $batchPath
$Shortcut.WorkingDirectory = $projectPath
$Shortcut.Description = "Start Media Downloader Application"
$Shortcut.IconLocation = "shell32.dll,174" # Download icon from shell32.dll
$Shortcut.Save()

Write-Host "Shortcut created at: $shortcutPath"
Write-Host "You can now copy this shortcut to your desktop or pin it to your taskbar."
