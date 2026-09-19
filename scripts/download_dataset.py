"""
ForgeMind AI — Dataset Download & Ingestion Script
Downloads the Manufacturing Data Shared Facility dataset from Mendeley Data.
Focuses on Model 1 and Model 2 for initial development; Model 3 deferred.
"""

import os
import sys
import json
import hashlib
import logging
import requests
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"

MENDELEY_API_URL = "https://data.mendeley.com/api/datasets/3rw227zxt7/files?version=2"

# Files to download for the MVP (Model 1 + Model 2 + shared assets)
# Model 3 files are listed but deferred
DOWNLOAD_MANIFEST = {
    # --- Model 1 (folder: Model 1) ---
    "Model_1.csv": {
        "id": "b6b3b24d-b2f6-4be8-8fe5-54d372313a7c",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/b6b3b24d-b2f6-4be8-8fe5-54d372313a7c/file_downloaded",
        "expected_size": 254339,
        "sha256": "66f2977648d138901ae8c2689bf4a030c28908802372ba701ef8ebfa47ba916b",
        "subfolder": "Model_1",
        "phase": "mvp",
    },
    "Model 1.doe": {
        "id": "1fb77f5e-3216-4c67-aa6d-364204f13917",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/1fb77f5e-3216-4c67-aa6d-364204f13917/file_downloaded",
        "expected_size": 422400,
        "sha256": "6cd54207bc50051d094a7a627e14a382d4fb2442dea9bcc2eeec32710bfaba4c",
        "subfolder": "Model_1",
        "phase": "mvp",
    },
    "Model 1.pdf": {
        "id": "ec490dcc-6522-4db8-92da-66f632b49962",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/ec490dcc-6522-4db8-92da-66f632b49962/file_downloaded",
        "expected_size": 101621,
        "sha256": "9181d471b60328411dfa62d9f4d6fae593acf3d5657c527c98582da11ab0ce69",
        "subfolder": "Model_1",
        "phase": "mvp",
    },
    # --- Model 2 (folder: Model 2) ---
    "Model_2.csv": {
        "id": "cc4c8023-0382-424f-b415-3ac5dd8f94a7",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/cc4c8023-0382-424f-b415-3ac5dd8f94a7/file_downloaded",
        "expected_size": 368720,
        "sha256": "bf714aa7fff574ca58fd73335010d300ff5db5b16c047982d38c8b6174a95dcb",
        "subfolder": "Model_2",
        "phase": "mvp",
    },
    "Model 2.doe": {
        "id": "274486c5-74b2-40ef-8f78-9800407e9cc1",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/274486c5-74b2-40ef-8f78-9800407e9cc1/file_downloaded",
        "expected_size": 692736,
        "sha256": "e6b434e530b7b62bc8bde88f2f239834d5089efd4213d618e92227a3ab39aa1a",
        "subfolder": "Model_2",
        "phase": "mvp",
    },
    "Model 2.pdf": {
        "id": "d10107c5-695d-4323-b5ce-71855d3ebaa7",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/d10107c5-695d-4323-b5ce-71855d3ebaa7/file_downloaded",
        "expected_size": 191588,
        "sha256": "2d6ef2ef91368b0a17b6e52fbbb197f21779ae8cc90f73e3b0480fd8a8fc4096",
        "subfolder": "Model_2",
        "phase": "mvp",
    },
    # --- Shared / Root-level files ---
    "Readme.txt": {
        "id": "55073795-5698-4441-9658-3347af23f4a5",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/55073795-5698-4441-9658-3347af23f4a5/file_downloaded",
        "expected_size": 1874,
        "sha256": "99736791dd3f017ea5336e29879688d82938d04ce80b8a92381ad858ce8344d5",
        "subfolder": "",
        "phase": "mvp",
    },
    # --- Model 3 (deferred — large files) ---
    "Model_3.csv": {
        "id": "bc8ce4ca-1ee2-440c-a2e8-fbf847df3f59",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/bc8ce4ca-1ee2-440c-a2e8-fbf847df3f59/file_downloaded",
        "expected_size": 311108363,
        "sha256": "f5b2df4fb4f9c7861a01b6eb2085f3dcfbf496ce8908dc70a0898625bc87a0da",
        "subfolder": "Model_3",
        "phase": "deferred",
    },
    "Model 3.doe": {
        "id": "ae46ccfe-965c-44a4-b947-1e7485a1ccdb",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/ae46ccfe-965c-44a4-b947-1e7485a1ccdb/file_downloaded",
        "expected_size": 1440768,
        "sha256": "dc1a4fd60d46c54877db982800beba8595f058599ee3ba0f83bc57a9b1127c3f",
        "subfolder": "Model_3",
        "phase": "deferred",
    },
    "Model 3.pdf": {
        "id": "31274a8c-e4bf-4971-abd0-e0051e39f32f",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/31274a8c-e4bf-4971-abd0-e0051e39f32f/file_downloaded",
        "expected_size": 246688,
        "sha256": "1402106500d5df5f242990d452eee552bb4a7f207596748b5e8b1600d8d3932b",
        "subfolder": "Model_3",
        "phase": "deferred",
    },
    "ParametersFile.xls": {
        "id": "937bdfbc-a6c2-4fd3-ab3d-6ad822f855cd",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/937bdfbc-a6c2-4fd3-ab3d-6ad822f855cd/file_downloaded",
        "expected_size": 86528,
        "sha256": "160cc414e74ccd39e8e0bf151acfe6634499dd5da13a91e9cb6c16b150d7426f",
        "subfolder": "Model_3",
        "phase": "deferred",
    },
    "3000Samplesv3.mat": {
        "id": "de1eef5f-02f4-4973-945e-8d099c5b27d2",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/de1eef5f-02f4-4973-945e-8d099c5b27d2/file_downloaded",
        "expected_size": 34831864,
        "sha256": "2981b81015074c8c6d2ec5418c4e34b50d92a2cca8e6efc610738b85c13342c0",
        "subfolder": "",
        "phase": "deferred",
    },
    "Matlab Models.zip": {
        "id": "60a79cf7-7fa8-453b-be87-6ec2bc462c5c",
        "url": "https://data.mendeley.com/public-files/datasets/3rw227zxt7/files/60a79cf7-7fa8-453b-be87-6ec2bc462c5c/file_downloaded",
        "expected_size": 34788,
        "sha256": "b05657bdd9ab73c84690b811a56803a330d6cec4fa9875a917d4644f94a4f205",
        "subfolder": "",
        "phase": "deferred",
    },
}

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("forgemind.download")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_size(size_bytes: int) -> str:
    """Return a human-readable file size string."""
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def _sha256(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def download_file(url: str, dest: Path, expected_size: int | None = None) -> bool:
    """Download a file with progress logging. Returns True on success."""
    try:
        resp = requests.get(url, stream=True, timeout=120)
        resp.raise_for_status()
    except requests.RequestException as exc:
        log.error("  ✗ Download failed: %s", exc)
        return False

    total = int(resp.headers.get("content-length", 0)) or expected_size or 0
    downloaded = 0

    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=65536):
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded / total * 100
                print(f"\r  ↓ {_format_size(downloaded)} / {_format_size(total)}  ({pct:.0f}%)", end="", flush=True)

    print()  # newline after progress
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def download_dataset(phase: str = "mvp", force: bool = False):
    """
    Download dataset files for the requested phase.
    
    Args:
        phase: 'mvp' to download Model 1+2 only, 'all' to include Model 3.
        force: If True, re-download even if the file already exists.
    """
    log.info("=" * 60)
    log.info("ForgeMind AI — Dataset Download")
    log.info("Phase: %s | Target: %s", phase, RAW_DATA_DIR)
    log.info("=" * 60)

    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

    results = {"downloaded": [], "skipped": [], "failed": [], "verified": []}

    for filename, meta in DOWNLOAD_MANIFEST.items():
        # Filter by phase
        if phase == "mvp" and meta["phase"] != "mvp":
            log.info("⏭  Skipping [%s] %s (deferred)", meta["phase"], filename)
            results["skipped"].append(filename)
            continue

        subfolder = meta.get("subfolder", "")
        dest = RAW_DATA_DIR / subfolder / filename if subfolder else RAW_DATA_DIR / filename

        # Skip if already exists and correct size
        if dest.exists() and not force:
            actual_size = dest.stat().st_size
            if meta.get("expected_size") and actual_size == meta["expected_size"]:
                log.info("✓  Already exists: %s (%s)", filename, _format_size(actual_size))
                results["skipped"].append(filename)
                continue
            elif meta.get("expected_size"):
                log.warning("⚠  Size mismatch for %s: expected %s, got %s — re-downloading",
                            filename, _format_size(meta["expected_size"]), _format_size(actual_size))

        log.info("↓  Downloading: %s (%s)", filename, _format_size(meta.get("expected_size", 0)))
        ok = download_file(meta["url"], dest, meta.get("expected_size"))
        if ok:
            results["downloaded"].append(filename)
            # Verify checksum
            if meta.get("sha256"):
                actual_hash = _sha256(dest)
                if actual_hash == meta["sha256"]:
                    log.info("  ✓ SHA-256 verified: %s", filename)
                    results["verified"].append(filename)
                else:
                    log.warning("  ⚠ SHA-256 mismatch for %s! expected=%s got=%s",
                                filename, meta["sha256"][:16] + "…", actual_hash[:16] + "…")
        else:
            results["failed"].append(filename)

    # ---------------------------------------------------------------------------
    # Print folder tree
    # ---------------------------------------------------------------------------
    log.info("")
    log.info("=" * 60)
    log.info("DATA FOLDER STRUCTURE")
    log.info("=" * 60)
    _print_tree(RAW_DATA_DIR)

    # ---------------------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------------------
    log.info("")
    log.info("=" * 60)
    log.info("DOWNLOAD SUMMARY")
    log.info("  Downloaded : %d", len(results["downloaded"]))
    log.info("  Verified   : %d", len(results["verified"]))
    log.info("  Skipped    : %d", len(results["skipped"]))
    log.info("  Failed     : %d", len(results["failed"]))
    log.info("=" * 60)

    if results["failed"]:
        log.error("Failed files: %s", ", ".join(results["failed"]))
        return False
    return True


def _print_tree(directory: Path, prefix: str = ""):
    """Recursively print a directory tree with file sizes."""
    entries = sorted(directory.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    for i, entry in enumerate(entries):
        connector = "└── " if i == len(entries) - 1 else "├── "
        if entry.is_dir():
            log.info("%s%s%s/", prefix, connector, entry.name)
            extension = "    " if i == len(entries) - 1 else "│   "
            _print_tree(entry, prefix + extension)
        else:
            size = _format_size(entry.stat().st_size)
            ext = entry.suffix.upper().lstrip(".")
            log.info("%s%s%s  [%s, %s]", prefix, connector, entry.name, ext, size)


if __name__ == "__main__":
    phase = "mvp"
    force = False
    if "--all" in sys.argv:
        phase = "all"
    if "--force" in sys.argv:
        force = True
    
    success = download_dataset(phase=phase, force=force)
    sys.exit(0 if success else 1)
