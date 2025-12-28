import pyautogui
import time
import os
import logging
import argparse
import yaml
import cv2  # For end marker image detection
from PIL import ImageGrab # Pillow's ImageGrab for screenshots

# --- Global Variables ---
config = {}
logger = None

# --- Configuration Loading ---
def load_config(config_path):
    """Loads configuration from the specified YAML file."""
    global config
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        # Resolve paths relative to working_dir if specified
        working_dir = config.get('paths', {}).get('working_dir', '.')
        for key in ['output_dir', 'log_file', 'config_file']:
            if key in config.get('paths', {}) and isinstance(config['paths'][key], str):
                 # Basic placeholder resolution, not fully robust
                 config['paths'][key] = config['paths'][key].replace('${working_dir}', working_dir)
        if config.get('controls', {}).get('end_marker', {}).get('method') == 'image':
             marker_file = config['controls']['end_marker'].get('file')
             if marker_file and isinstance(marker_file, str):
                 config['controls']['end_marker']['file'] = marker_file.replace('${working_dir}', working_dir)

        # Ensure necessary directories exist
        os.makedirs(os.path.dirname(config['paths']['log_file']), exist_ok=True)
        os.makedirs(config['paths']['output_dir'], exist_ok=True)
        if not os.path.exists(working_dir):
             logger.warning(f"Working directory specified in config does not exist: {working_dir}")


        return True
    except FileNotFoundError:
        print(f"Error: Configuration file not found at {config_path}")
        return False
    except yaml.YAMLError as e:
        print(f"Error parsing configuration file: {e}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred while loading config: {e}")
        return False


# --- Logging Setup ---
def setup_logging():
    """Configures logging based on the loaded configuration."""
    global logger
    log_config = config.get('logging', {})
    log_level_str = log_config.get('level', 'INFO').upper()
    log_file = config.get('paths', {}).get('log_file', 'autocap.log')

    log_level = getattr(logging, log_level_str, logging.INFO)

    # Basic logging setup (consider adding rotation later)
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler() # Also print logs to console
        ]
    )
    logger = logging.getLogger(__name__)
    logger.info("Logging initialized.")
    logger.debug(f"Loaded configuration: {config}")


# --- GUI Automation Functions ---
def focus_window(title):
    """Attempts to find and focus the window with the given title."""
    logger.info(f"Attempting to focus window with title containing: '{title}'")
    try:
        windows = pyautogui.getWindowsWithTitle(title)
        if not windows:
            logger.warning(f"No window found with title containing '{title}'. Please ensure Kindle is running and the title matches.")
            # Attempt a broader search or wait? For now, proceed but warn.
            return None # Indicate failure or inability to focus specifically
        else:
            # Try activating the first found window
            target_window = windows[0]
            if target_window:
                try:
                    if target_window.isMinimized:
                         target_window.restore()
                    if not target_window.isActive:
                         target_window.activate()
                    # Small delay to ensure focus takes effect
                    time.sleep(0.5)
                    logger.info(f"Successfully focused window: {target_window.title}")
                    return target_window
                except Exception as e: # Catch potential pygetwindow errors
                    logger.error(f"Error activating window '{target_window.title}': {e}. Manual focus might be required.")
                    return None
            else:
                 logger.warning(f"Could not get a valid window object for title '{title}'.")
                 return None
    except Exception as e:
        logger.error(f"An error occurred while trying to find/focus the window: {e}")
        return None


def take_screenshot(region=None):
    """Takes a screenshot of the specified region or the entire screen."""
    try:
        screenshot = ImageGrab.grab(bbox=region) # bbox expects (left, top, right, bottom)
        logger.debug(f"Screenshot taken. Region: {'Fullscreen' if region is None else region}")
        return screenshot
    except Exception as e:
        logger.error(f"Failed to take screenshot: {e}")
        return None


def check_end_marker():
    """Checks if the end marker (image or pixel) is present on the screen."""
    marker_config = config.get('controls', {}).get('end_marker', {})
    method = marker_config.get('method', 'none')

    if method == 'image':
        image_path = marker_config.get('file')
        confidence = marker_config.get('confidence', 0.9)
        if not image_path or not os.path.exists(image_path):
            logger.warning(f"End marker image file not found or not specified: {image_path}")
            return False
        try:
            logger.debug(f"Searching for end marker image: {image_path} with confidence {confidence}")
            location = pyautogui.locateOnScreen(image_path, confidence=confidence)
            if location:
                logger.info(f"End marker image found at: {location}")
                return True
            else:
                 logger.debug("End marker image not found.")
                 return False
        except pyautogui.ImageNotFoundException:
             logger.debug("End marker image not found (ImageNotFoundException).")
             return False
        except Exception as e:
            # OpenCV might raise errors if the image is invalid
            logger.error(f"Error searching for end marker image '{image_path}': {e}")
            return False # Treat errors as marker not found

    elif method == 'pixel':
        # Placeholder for pixel detection logic
        logger.warning("Pixel-based end marker detection is not yet implemented.")
        # coords = marker_config.get('pixel_coords')
        # expected_color = marker_config.get('pixel_color')
        # if coords and expected_color:
        #     # Get pixel color using pyautogui.pixel(x, y)
        #     # Compare with expected_color (tolerance might be needed)
        #     pass
        return False

    elif method == 'none':
        logger.debug("No end marker detection configured.")
        return False

    else:
        logger.warning(f"Unknown end marker method specified: {method}")
        return False


# --- Main Execution Logic ---
def run_capture():
    """Main function to run the Kindle capture process."""
    logger.info("Starting Kindle Auto Capture process...")

    # Initial delay for user preparation
    start_delay = config.get('controls', {}).get('start_delay', 3)
    logger.info(f"Waiting {start_delay} seconds for user to prepare Kindle window...")
    time.sleep(start_delay)

    # Focus Kindle Window
    window_title = config.get('controls', {}).get('window_title', 'Kindle')
    kindle_window = focus_window(window_title)
    # Even if focusing failed, we might proceed, relying on user having focused it.

    # Capture Loop
    page_count = 1
    max_pages = config.get('capture', {}).get('max_pages', 2000)
    output_dir = config.get('paths', {}).get('output_dir', 'captures')
    file_pattern = config.get('capture', {}).get('file_pattern', 'page_%04d.png')
    delay_after_page = config.get('capture', {}).get('delay_after_page', 0.8)
    next_page_key = config.get('controls', {}).get('next_page_key', 'pagedown')
    capture_region_config = config.get('capture', {}).get('region') # List [x, y, w, h] or None

    # Convert region [x, y, w, h] to Pillow's bbox format [x, y, x+w, y+h]
    capture_bbox = None
    if capture_region_config and len(capture_region_config) == 4:
        x, y, w, h = capture_region_config
        capture_bbox = (x, y, x + w, y + h)
        logger.info(f"Using capture region: {capture_bbox}")
    else:
        logger.info("Using fullscreen capture.")


    logger.info(f"Starting capture loop. Max pages: {max_pages}")
    try:
        while page_count <= max_pages:
            logger.info(f"--- Processing Page {page_count} ---")

            # 1. Check for end marker BEFORE capture
            if check_end_marker():
                logger.info("End marker detected. Stopping capture.")
                break

            # 2. Take Screenshot
            screenshot = take_screenshot(region=capture_bbox)
            if screenshot is None:
                logger.error("Failed to capture screenshot. Stopping.")
                break # Or maybe retry?

            # 3. Save Image
            try:
                filename = file_pattern % page_count
                save_path = os.path.join(output_dir, filename)
                screenshot.save(save_path)
                logger.info(f"Page {page_count} saved as {save_path}")
            except Exception as e:
                logger.error(f"Failed to save image {filename}: {e}")
                # Decide whether to stop or continue
                break

            # 4. Press Next Page Key
            try:
                logger.debug(f"Pressing '{next_page_key}' key.")
                pyautogui.press(next_page_key)
            except Exception as e:
                 logger.error(f"Failed to press key '{next_page_key}': {e}. Stopping.")
                 break

            # 5. Wait after page turn
            logger.debug(f"Waiting {delay_after_page} seconds...")
            time.sleep(delay_after_page)

            # 6. Increment Counter
            page_count += 1

            # Add a small safety pause between iterations
            time.sleep(0.1)

    except KeyboardInterrupt:
        logger.warning("Capture process interrupted by user (Ctrl+C).")
    except Exception as e:
        logger.exception(f"An unexpected error occurred during the capture loop: {e}") # Use logger.exception to include traceback
    finally:
        logger.info(f"Capture loop finished. Total pages captured: {page_count - 1}")

    # --- Post-processing (Placeholders) ---
    if config.get('postprocess', {}).get('assemble_pdf', False):
        logger.info("PDF assembly requested (Not implemented).")
        # Placeholder: call pdf assembly function
        pass

    if config.get('postprocess', {}).get('ocr', False):
        logger.info("OCR requested (Not implemented).")
        # Placeholder: call ocr function
        pass

    if config.get('postprocess', {}).get('cleanup_png', False):
        logger.info("PNG cleanup requested (Not implemented).")
        # Placeholder: delete PNGs in output_dir
        pass

    logger.info("Kindle Auto Capture process finished.")


# --- Entry Point ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kindle Auto Capture Script")
    parser.add_argument(
        "--config",
        type=str,
        default="kindle_autocap.yaml",
        help="Path to the configuration YAML file (default: kindle_autocap.yaml)"
    )
    args = parser.parse_args()

    if load_config(args.config):
        setup_logging()
        run_capture()
    else:
        print("Exiting due to configuration loading errors.")
        exit(1) 