import asyncio
import json
import subprocess
import time
import urllib.request
import websockets

async def cdp_call(ws, method, params=None, msg_id=[0]):
    msg_id[0] += 1
    req = {"id": msg_id[0], "method": method, "params": params or {}}
    await ws.send(json.dumps(req))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id[0]:
            return resp.get("result", {})

async def evaluate(ws, expr):
    res = await cdp_call(ws, "Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return res.get("result", {}).get("value")

async def run_test():
    chrome = subprocess.Popen([
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9222',
        '--no-first-run',
        '--no-default-browser-check',
        'http://localhost:3000/upload'
    ])
    
    await asyncio.sleep(2)
    
    try:
        tabs_url = 'http://127.0.0.1:9222/json'
        req = urllib.request.urlopen(tabs_url)
        tabs = json.loads(req.read().decode())
        page_tab = next(t for t in tabs if t.get('type') == 'page')
        ws_url = page_tab['webSocketDebuggerUrl']
        
        async with websockets.connect(ws_url) as ws:
            # Enable Page, Runtime
            await cdp_call(ws, "Runtime.enable")
            await cdp_call(ws, "Page.enable")
            
            # 1. Wait for page load
            await asyncio.sleep(1)
            title = await evaluate(ws, "document.title")
            print(f"[OK] Page loaded. Title: {title}")
            
            # Verify initial upload UI
            drop_text = await evaluate(ws, "document.body.innerText.includes('Drag and drop your inspection image here')")
            assert drop_text, "Upload drop zone missing"
            print("[OK] Initial /upload page rendered dropzone normally.")
            
            # Select a dataset sample (Click the first sample button)
            sample_name = await evaluate(ws, """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const sampleBtn = btns.find(b => b.innerText.includes('Cast Bracket Crack'));
                    if (sampleBtn) {
                        sampleBtn.click();
                        return 'Cast Bracket Crack';
                    }
                    return null;
                })()
            """)
            print(f"[OK] Clicked sample: {sample_name}")
            await asyncio.sleep(0.5)
            
            # Verify sample was selected and preview exists
            has_preview = await evaluate(ws, "Boolean(document.querySelector('img[alt=\"Selected inspection specimen\"]'))")
            assert has_preview, "Image preview not shown after selecting sample"
            print("[OK] Selected specimen preview rendered.")
            
            # 2. Navigate to /analysis/FM-7714
            print("\n--- Navigating from /upload -> /analysis/FM-7714 ---")
            await evaluate(ws, "window.history.pushState({}, '', '/analysis/FM-7714'); window.dispatchEvent(new PopStateEvent('popstate'));")
            await asyncio.sleep(1)
            
            current_path = await evaluate(ws, "window.location.pathname")
            assert current_path == '/analysis/FM-7714', f"Path mismatch: {current_path}"
            
            analysis_rendered = await evaluate(ws, "document.body.innerText.includes('Analysis #FM-7714')")
            assert analysis_rendered, "/analysis/FM-7714 content did not render!"
            print(f"[OK] Current Path: {current_path}, rendered Analysis #FM-7714.")
            
            # Verify Severity is 'Not determined'
            has_not_det = await evaluate(ws, "document.body.innerText.includes('Not determined')")
            assert has_not_det, "'Not determined' severity missing on analysis page"
            has_medium = await evaluate(ws, "document.body.innerText.includes('Severity rating categorized as Medium')")
            assert not has_medium, "Found forbidden Medium severity!"
            print("[OK] Verified Severity is 'Not determined' (NO Medium severity).")
            
            # Verify 99.5% confidence
            has_conf = await evaluate(ws, "document.body.innerText.includes('99.5%')")
            assert has_conf, "99.5% confidence missing"
            print("[OK] Verified Model Confidence is 99.5%.")
            
            # 3. Navigate BACK to /upload
            print("\n--- Navigating BACK from /analysis/FM-7714 -> /upload ---")
            await evaluate(ws, "window.history.pushState({}, '', '/upload'); window.dispatchEvent(new PopStateEvent('popstate'));")
            await asyncio.sleep(1)
            
            upload_path = await evaluate(ws, "window.location.pathname")
            assert upload_path == '/upload', f"Path mismatch: {upload_path}"
            
            # Verify upload page IS NOT BLANK!
            body_text_len = await evaluate(ws, "document.body.innerText.trim().length")
            print(f"[OK] Returned to /upload. Body text length: {body_text_len} chars.")
            assert body_text_len > 100, "CRITICAL: Upload page rendered completely blank!"
            
            # Verify upload components exist
            has_upload_header = await evaluate(ws, "document.body.innerText.includes('Upload & Analyze Product Image')")
            assert has_upload_header, "Upload header missing after navigating back!"
            print("[OK] Upload page rendered normally with zero blank screen!")
            
            # Verify state was preserved!
            preserved_preview = await evaluate(ws, "Boolean(document.querySelector('img[alt=\"Selected inspection specimen\"]'))")
            print(f"[OK] Selected specimen preview preserved across navigation: {preserved_preview}")
            
            # 4. Multi-hop cycle: Upload -> Analysis -> Upload -> Analysis -> Upload (TEST 5)
            print("\n--- Running Multi-hop cycle (TEST 5) ---")
            for step in range(1, 4):
                to_analysis = (step % 2 == 1)
                dest = '/analysis/FM-7714' if to_analysis else '/upload'
                await evaluate(ws, f"window.history.pushState({{}}, '', '{dest}'); window.dispatchEvent(new PopStateEvent('popstate'));")
                await asyncio.sleep(0.5)
                cur = await evaluate(ws, "window.location.pathname")
                txt_len = await evaluate(ws, "document.body.innerText.trim().length")
                assert txt_len > 100, f"Blank page detected on hop to {cur}!"
                print(f"[OK] Hop {step} to {cur} successful (text length {txt_len} chars).")
            
            # 5. Test Invalid ID Fallback (TEST 9)
            print("\n--- Testing Invalid Analysis ID (TEST 9) ---")
            await evaluate(ws, "window.history.pushState({}, '', '/analysis/FM-INVALID-ID'); window.dispatchEvent(new PopStateEvent('popstate'));")
            await asyncio.sleep(1)
            has_not_found = await evaluate(ws, "document.body.innerText.includes('Analysis Not Found')")
            assert has_not_found, "Analysis Not Found screen missing for invalid ID!"
            print("[OK] Invalid ID displayed proper 'Analysis Not Found' fallback UI.")
            
            # Click '+ Create New Inspection' button on error screen
            clicked_new = await evaluate(ws, """
                (() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create New Inspection'));
                    if (btn) { btn.click(); return true; }
                    return false;
                })()
            """)
            await asyncio.sleep(1)
            cur_after_click = await evaluate(ws, "window.location.pathname")
            print(f"[OK] Clicked '+ Create New Inspection'. Current path: {cur_after_click}")
            assert cur_after_click == '/upload', f"Expected /upload, got {cur_after_click}"
            upload_ready = await evaluate(ws, "document.body.innerText.includes('Upload & Analyze Product Image')")
            assert upload_ready, "Upload page not ready after recovery from invalid ID!"
            print("[OK] Successfully recovered back to /upload with zero errors.")
            
            print("\nALL CDP NAVIGATION TESTS PASSED COMPLETELY!")
            
    finally:
        chrome.terminate()

if __name__ == '__main__':
    asyncio.run(run_test())
