import os
import sys
import webbrowser
import subprocess

app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "index.html"))

# Try to launch in Chrome or Edge App Mode (Clean Standalone Desktop Window)
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

if os.path.exists(edge_path):
    subprocess.Popen([edge_path, f"--app=file:///{app_path}"])
elif os.path.exists(chrome_path):
    subprocess.Popen([chrome_path, f"--app=file:///{app_path}"])
else:
    webbrowser.open(f"file:///{app_path}")
