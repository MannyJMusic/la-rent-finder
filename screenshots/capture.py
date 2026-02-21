#!/usr/bin/env python3
"""
Screenshot capture script for HTML documentation
Requires: pip install selenium pillow
"""
import sys
import os
from pathlib import Path

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from PIL import Image
    import time
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install selenium pillow")
    sys.exit(1)

def capture_html_screenshot(html_file, output_file, width=1200, height=2400):
    """Capture a screenshot of an HTML file"""

    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument(f'--window-size={width},{height}')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    # Initialize driver
    try:
        driver = webdriver.Chrome(options=chrome_options)
    except Exception as e:
        print(f"Error initializing Chrome driver: {e}")
        print("Make sure Chrome and chromedriver are installed")
        return False

    try:
        # Load the HTML file
        file_url = f"file://{os.path.abspath(html_file)}"
        print(f"Loading {file_url}")
        driver.get(file_url)

        # Wait for page to load
        time.sleep(2)

        # Get page dimensions
        total_height = driver.execute_script("return document.body.scrollHeight")
        driver.set_window_size(width, total_height)

        # Take screenshot
        print(f"Capturing screenshot to {output_file}")
        driver.save_screenshot(output_file)

        print(f"✓ Screenshot saved successfully: {output_file}")
        return True

    except Exception as e:
        print(f"Error capturing screenshot: {e}")
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    html_file = "REC-124-implementation-summary.html"
    output_file = "REC-124-implementation-complete.png"

    if not os.path.exists(html_file):
        print(f"Error: {html_file} not found")
        sys.exit(1)

    success = capture_html_screenshot(html_file, output_file)
    sys.exit(0 if success else 1)
