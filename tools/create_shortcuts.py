# -*- coding: utf-8 -*-
import os
import subprocess

def create_shortcuts():
    desktop = os.path.expanduser("~/Desktop")
    # In Chinese Windows, ensure actual Desktop path
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders")
        d, _ = winreg.QueryValueEx(key, "Desktop")
        winreg.CloseKey(key)
        d = os.path.expandvars(d)
        if os.path.isdir(d):
            desktop = d
    except Exception:
        pass

    target_bat = r"D:\project\card_game\start_card_game.bat"
    target_editor = r"D:\project\card_game\CardGame_Editor.bat"
    work_dir = r"D:\project\card_game"

    # Create VBS script to generate shortcuts cleanly without encoding pitfalls
    vbs_content = f'''
Set oWS = WScript.CreateObject("WScript.Shell")

sLinkFile = "{desktop}\\宿命对决.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "{target_bat}"
oLink.WorkingDirectory = "{work_dir}"
oLink.Description = "宿命对决 Destiny Duel - 1v1卡牌RPG网页对决"
oLink.Save

sEditorLink = "{desktop}\\宿命对决 - 游戏制作器.lnk"
Set oEditorLink = oWS.CreateShortcut(sEditorLink)
oEditorLink.TargetPath = "{target_editor}"
oEditorLink.WorkingDirectory = "{work_dir}"
oEditorLink.Description = "宿命对决 - 游戏编辑器与数值同步工具"
oEditorLink.Save
'''
    vbs_path = os.path.join(work_dir, "tools", "make_shortcuts.vbs")
    with open(vbs_path, "w", encoding="ansi") as f:
        f.write(vbs_content)

    subprocess.run(["cscript", "//nologo", vbs_path], check=True)
    if os.path.exists(vbs_path):
        os.remove(vbs_path)

    print(f"Shortcuts successfully created on desktop: {desktop}")

if __name__ == "__main__":
    create_shortcuts()
