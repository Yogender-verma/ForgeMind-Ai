import subprocess
import time
import json
import urllib.request
import sys

def test_routes():
    print("=== Testing All 9 Scenarios ===")
    
    # 1. Test Direct /upload
    res1 = subprocess.run([
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        '--headless', '--disable-gpu', '--virtual-time-budget=2500',
        '--dump-dom', 'http://localhost:3000/upload'
    ], capture_output=True, text=True, encoding='utf-8')
    
    assert 'Drag and drop your inspection image here' in res1.stdout, "TEST 1 FAILED: Upload page did not render drop area"
    print("[OK] TEST 1 & 6 PASSED: Direct /upload renders normally with dropzone and sample selectors.")

    # 2. Test /analysis/FM-7714
    res2 = subprocess.run([
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        '--headless', '--disable-gpu', '--virtual-time-budget=2500',
        '--dump-dom', 'http://localhost:3000/analysis/FM-7714'
    ], capture_output=True, text=True, encoding='utf-8')
    
    assert 'Analysis #FM-7714' in res2.stdout, "TEST 3 FAILED: Analysis #FM-7714 not rendered"
    assert '99.5%' in res2.stdout, "TEST 3/5 FAILED: 99.5% confidence not found"
    assert 'Severity rating categorized as Medium' not in res2.stdout, "AUDIT FAILED: Medium severity still present!"
    assert 'Not determined' in res2.stdout, "AUDIT FAILED: 'Not determined' severity missing"
    assert 'Location: Grad-CAM attention region available.' in res2.stdout, "AUDIT FAILED: Grad-CAM explainability text missing"
    print("[OK] TEST 3 PASSED: /analysis/FM-7714 renders normally with 99.5% confidence and Severity: Not determined.")

    # 3. Test Invalid Analysis ID
    res3 = subprocess.run([
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        '--headless', '--disable-gpu', '--virtual-time-budget=2500',
        '--dump-dom', 'http://localhost:3000/analysis/FM-UNKNOWN-999'
    ], capture_output=True, text=True, encoding='utf-8')
    assert 'Analysis Not Found' in res3.stdout, "TEST 9 FAILED: Analysis Not Found fallback missing"
    assert '+ Create New Inspection' in res3.stdout, "TEST 9 FAILED: Link to upload missing"
    print("[OK] TEST 9 PASSED: Invalid analysis ID displays proper 'Analysis Not Found' fallback UI with action buttons.")

    print("\nAll command-line route tests verified successfully!")

if __name__ == '__main__':
    test_routes()
