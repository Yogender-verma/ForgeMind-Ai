import subprocess
import time
import json
import urllib.request
import urllib.parse
import os

def run_interactive_test():
    chrome_proc = subprocess.Popen([
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9222',
        '--no-first-run',
        '--no-default-browser-check',
        'http://localhost:3000/upload'
    ])
    
    time.sleep(2)
    
    try:
        # Get debugging tabs
        tabs_url = 'http://127.0.0.1:9222/json'
        req = urllib.request.urlopen(tabs_url)
        tabs = json.loads(req.read().decode())
        page_tab = next(t for t in tabs if t.get('type') == 'page')
        ws_url = page_tab['webSocketDebuggerUrl']
        print(f"[OK] Connected to headless Chrome CDP: {ws_url}")
        
        # We can use simple HTTP JSON endpoints or Python websocket if installed,
        # or use Runtime.evaluate via standard CDP over websockets if websocket client available.
        # Let's check if websocket client is available or use standard python library.
    except Exception as e:
        print(f"Notice: {e}")
    finally:
        chrome_proc.terminate()

if __name__ == '__main__':
    run_interactive_test()
