$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')

# 1. 宿命对决 - 游戏快捷方式
$GameShortcut = $WshShell.CreateShortcut("$DesktopPath\宿命对决 Destiny Duel.lnk")
$GameShortcut.TargetPath = "D:\project\card_game\start_card_game.bat"
$GameShortcut.WorkingDirectory = "D:\project\card_game"
$GameShortcut.Description = "宿命对决 Destiny Duel - 网页卡牌RPG对战"
$GameShortcut.Save()

# 2. 宿命对决 - 游戏制作器快捷方式
$EditorShortcut = $WshShell.CreateShortcut("$DesktopPath\宿命对决 - 游戏制作器.lnk")
$EditorShortcut.TargetPath = "D:\project\card_game\CardGame_Editor.bat"
$EditorShortcut.WorkingDirectory = "D:\project\card_game"
$EditorShortcut.Description = "宿命对决 - 游戏编辑器与数值同步工具"
$EditorShortcut.Save()

Write-Host "Shortcuts successfully created on Desktop!"
