import os
import threading
import subprocess

CREATE_NO_WINDOW = 0x08000000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def start_server():
    subprocess.Popen(["python", "manage.py", "runserver"], cwd=BASE_DIR, creationflags=CREATE_NO_WINDOW)

def start_desktop_app():
    subprocess.Popen(["python", "desktop_app/main.py"], cwd=BASE_DIR, creationflags=CREATE_NO_WINDOW)

def start_overlay():
    overlay_dir = os.path.join(BASE_DIR, "obs-overlay")
    subprocess.Popen(["npm", "run", "dev"], cwd=overlay_dir, shell=True, creationflags=CREATE_NO_WINDOW)

thread1 = threading.Thread(target=start_server)
thread2 = threading.Thread(target=start_desktop_app)
thread3 = threading.Thread(target=start_overlay)

thread1.start()
thread2.start()
thread3.start()
