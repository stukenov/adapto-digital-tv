import os
import ftplib
import sqlite3
from pathlib import Path
import logging
import sys
import traceback
import time

# Configure logging with detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# FTP credentials
FTP_HOST = "81.88.148.122"
FTP_PORT = 2103
FTP_USER = "your-username"
FTP_PASS = "Iagvd6"

# Database and output file paths
DB_PATH = "birgetv.db"
OUTPUT_FILE = "video_names.txt"


def connect_ftp():
    """Establish FTP connection"""
    try:
        logger.debug(
            "Attempting to connect to FTP server %s:%s with user %s",
            FTP_HOST,
            FTP_PORT,
            FTP_USER,
        )
        ftp = ftplib.FTP()
        ftp.connect(FTP_HOST, FTP_PORT)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.voidcmd("TYPE I")  # Set binary mode to avoid ASCII mode issues
        ftp.set_pasv(True)  # Use passive mode
        ftp.encoding = (
            "utf-8"  # Set UTF-8 encoding for proper handling of non-ASCII characters
        )
        logger.info("Successfully connected to FTP server")
        return ftp
    except Exception as e:
        logger.error("Failed to connect to FTP server: %s", str(e))
        logger.debug("Connection error details:\n%s", traceback.format_exc())
        raise


def get_video_files(ftp, path="/"):
    """Recursively get all video files (MP4 and MXF) from FTP"""
    files = []

    try:
        logger.debug("Scanning directory: %s", path)
        ftp.cwd(path)
        time.sleep(1)  # Add delay between operations

        try:
            items = []
            retries = 3
            for attempt in range(retries):
                try:
                    ftp.voidcmd("TYPE I")  # Set binary mode before listing
                    items = ftp.nlst()
                    break
                except ftplib.error_temp as e:
                    if attempt < retries - 1:
                        logger.warning(
                            "Temporary error listing directory %s, retrying... Error: %s",
                            path,
                            str(e),
                        )
                        time.sleep(2)  # Wait before retry
                        continue
                    raise

            logger.debug("Found %d items in directory %s", len(items), path)

        except Exception as e:
            logger.warning("Failed to list directory %s: %s", path, str(e))
            return files

        for item in items:
            try:
                # Skip .lnk files
                if item.lower().endswith(".lnk"):
                    logger.debug("Skipping .lnk file: %s", item)
                    continue

                current_path = f"{path}/{item}"
                logger.debug("Processing item: %s", current_path)

                # Try to change directory to check if it's a folder
                try:
                    ftp.cwd(current_path)
                    time.sleep(0.5)  # Small delay after cwd
                    logger.debug("Item %s is a directory, recursing...", item)
                    # If successful, it's a directory - recurse into it
                    files.extend(get_video_files(ftp, current_path))
                    ftp.cwd("..")  # Go back up
                    time.sleep(0.5)  # Small delay after going back
                    logger.debug("Returned to parent directory: %s", path)
                except ftplib.error_perm:
                    # If failed to change directory, it's a file
                    if item.lower().endswith((".mp4", ".mxf")):
                        full_path = f"{path}/{item}"
                        if full_path.startswith("//"):
                            full_path = full_path[1:]
                        files.append(full_path)
                        logger.debug("Found video file: %s", full_path)

            except Exception as e:
                logger.error("Error processing item %s: %s", item, str(e))
                logger.debug(
                    "Item processing error details:\n%s", traceback.format_exc()
                )
                continue

    except Exception as e:
        logger.error("Error accessing path %s: %s", path, str(e))
        logger.debug("Access error details:\n%s", traceback.format_exc())

    return files


def init_database():
    """Initialize SQLite database"""
    try:
        logger.debug("Initializing SQLite database at %s", DB_PATH)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Create table for video files
        logger.debug("Creating videos table if not exists")
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS videos (
            full_path TEXT PRIMARY KEY,
            filename TEXT,
            directory TEXT
        )
        """
        )

        conn.commit()
        logger.debug("Database initialization successful")
        return conn
    except Exception as e:
        logger.error("Database initialization error: %s", str(e))
        logger.debug("Database error details:\n%s", traceback.format_exc())
        raise


def main():
    try:
        logger.info("Starting video file scanning process")

        # Connect to FTP
        ftp = connect_ftp()

        # Get all video files
        logger.info("Starting to scan FTP for video files (MP4 and MXF)...")
        video_files = get_video_files(ftp)
        logger.info("Found %d video files", len(video_files))
        logger.debug("List of found files:\n%s", "\n".join(video_files))

        # Initialize database
        conn = init_database()
        cursor = conn.cursor()

        # Store files in database
        logger.debug("Starting database update")
        video_info = []
        for file_path in video_files:
            path = Path(file_path)
            filename = path.stem  # Get filename without extension
            directory = path.parent.name  # Get only the immediate parent directory name
            video_info.append((filename, directory))
            logger.debug(
                "Processing file: %s -> %s in directory %s",
                file_path,
                filename,
                directory,
            )

            cursor.execute(
                "INSERT OR REPLACE INTO videos (full_path, filename, directory) VALUES (?, ?, ?)",
                (file_path, filename, directory),
            )

        conn.commit()
        logger.info("Database updated successfully with %d entries", len(video_info))

        # Write video names and their directories to text file
        logger.debug("Writing video information to %s", OUTPUT_FILE)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            for name, directory in video_info:
                f.write(f"{directory}/{name}\n")

        logger.info("Video information written to %s", OUTPUT_FILE)

        # Cleanup
        logger.debug("Cleaning up connections")
        conn.close()
        ftp.quit()
        logger.info("Process completed successfully")

    except Exception as e:
        logger.error("Error in main process: %s", str(e))
        logger.debug("Error details:\n%s", traceback.format_exc())


if __name__ == "__main__":
    main()
