"""
Site Prepare Pages - ESP32 firmware packaging for GitHub Pages
Usage: python prepare_pages.py --build-dir <build> --site-dir <site> --output-dir <dist> --release-id <id>
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def get_platformio_metadata(build_dir: Path) -> dict:
    """Extract flash parameters from PlatformIO build metadata."""
    metadata_path = build_dir / ".pio" / "build" / "esp32" / "idedata.json"
    
    if not metadata_path.exists():
        raise FileNotFoundError(f"idedata.json not found: {metadata_path}")
    
    with open(metadata_path, 'r') as f:
        data = json.load(f)
    
    # Parse upload_flags to find flash parameters
    upload_flags = data.get('upload_flags', [])
    flash_mode = 'dio'
    flash_freq = '40m'
    flash_size = '4MB'
    
    for flag in upload_flags:
        if flag.startswith('-D') and 'ARDUINO' in flag:
            continue
        if flag == '-fm':
            idx = upload_flags.index(flag)
            flash_mode = upload_flags[idx + 1] if idx + 1 < len(upload_flags) else 'dio'
        elif flag == '-ff':
            idx = upload_flags.index(flag)
            flash_freq = upload_flags[idx + 1] if idx + 1 < len(upload_flags) else '40m'
        elif flag == '-fs':
            idx = upload_flags.index(flag)
            flash_size = upload_flags[idx + 1] if idx + 1 < len(upload_flags) else '4MB'
    
    # Find binary offsets from build output
    build_dir_esp32 = build_dir / ".pio" / "build" / "esp32"
    bootloader = build_dir_esp32 / "bootloader.bin"
    partitions = build_dir_esp32 / "partitions.bin"
    firmware = build_dir_esp32 / "firmware.bin"
    
    # boot_app0.bin is optional in some configurations
    boot_app0 = build_dir_esp32 / "boot_app0.bin"
    
    # Get offsets from platformio.ini or default
    offsets = {
        'bootloader': 0x1000,
        'partitions': 0x8000,
        'boot_app0': 0xE000,
        'firmware': 0x10000
    }
    
    return {
        'bootloader': str(bootloader),
        'partitions': str(partitions),
        'boot_app0': str(boot_app0),
        'firmware': str(firmware),
        'flash_mode': flash_mode,
        'flash_freq': flash_freq,
        'flash_size': flash_size,
        'offsets': offsets
    }


def merge_firmware(binaries: list, offsets: dict, output: Path, flash_params: dict) -> Path:
    """Merge ESP32 binaries into single image using esptool."""
    cmd = [
        'esptool', '--chip', 'esp32', 'merge-bin',
        f'-fm', flash_params['flash_mode'],
        f'-ff', flash_params['flash_freq'],
        f'-fs', flash_params['flash_size'],
        '-o', str(output)
    ]
    
    for binary in binaries:
        path = binary['path']
        offset = binary['offset']
        cmd.extend([str(offset), str(path)])
    
    print(f"Running: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        raise RuntimeError(f"esptool merge failed: {result.stderr}")
    
    return output


def compute_sha256(filepath: Path) -> str:
    """Compute SHA-256 hash of file."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def create_manifest(release_id: str, merged_path: str) -> dict:
    """Create ESP Web Tools compatible manifest."""
    return {
        "name": "SlimeVR BMI160 Tracker",
        "version": release_id,
        "home_page": "https://github.com/juarendra/SlimeVR-BMI160",
        "new_install_prompt_erase": False,
        "new_install_improv_wait_time": 0,
        "builds": [
            {
                "chipFamily": "ESP32",
                "parts": [
                    {
                        "path": merged_path,
                        "offset": 0
                    }
                ]
            }
        ]
    }


def copy_assets(site_dir: Path, output_dir: Path, release_id: str):
    """Copy site files and firmware to dist directory."""
    # Copy static site files
    for item in site_dir.iterdir():
        if item.is_file():
            shutil.copy2(item, output_dir / item.name)
        elif item.is_dir() and item.name not in ['firmware', 'dist']:
            shutil.copytree(item, output_dir / item.name, dirs_exist_ok=True)
    
    # Copy firmware binaries to versioned directory
    firmware_dir = output_dir / "firmware" / release_id
    firmware_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy merged binary and manifest
    merged_bin = firmware_dir / "slimevr-bmi160-esp32-full.bin"
    manifest_path = output_dir / "manifest.json"
    
    return merged_bin, manifest_path


def main():
    parser = argparse.ArgumentParser(description='Package firmware for ESP Web Tools')
    parser.add_argument('--build-dir', required=True, help='PlatformIO build directory')
    parser.add_argument('--site-dir', required=True, help='Site source directory')
    parser.add_argument('--output-dir', required=True, help='Output dist directory')
    parser.add_argument('--release-id', required=True, help='Release ID (e.g., positron-abc123)')
    
    args = parser.parse_args()
    
    build_dir = Path(args.build_dir)
    site_dir = Path(args.site_dir)
    output_dir = Path(args.output_dir)
    release_id = args.release_id
    
    # Validate paths
    if not build_dir.exists():
        raise FileNotFoundError(f"Build directory not found: {build_dir}")
    if not site_dir.exists():
        raise FileNotFoundError(f"Site directory not found: {site_dir}")
    
    # Clean output
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Building release: {release_id}")
    print(f"Output directory: {output_dir}")
    
    # Get PlatformIO metadata
    print("Extracting PlatformIO metadata...")
    metadata = get_platformio_metadata(build_dir)
    
    # Verify binaries exist (boot_app0.bin is optional)
    binaries_to_check = ['bootloader', 'partitions', 'firmware']
    for key in binaries_to_check:
        bin_path = metadata[key]
        if not Path(bin_path).exists():
            raise FileNotFoundError(f"Binary not found: {bin_path}")
    
    # Create firmware output directory
    firmware_dir = output_dir / "firmware" / release_id
    firmware_dir.mkdir(parents=True, exist_ok=True)
    
    merged_bin = firmware_dir / "slimevr-bmi160-esp32-full.bin"
    
    print("Merging firmware binaries...")
    binaries = [
        {'path': metadata['bootloader'], 'offset': metadata['offsets']['bootloader']},
        {'path': metadata['partitions'], 'offset': metadata['offsets']['partitions']},
        {'path': metadata['firmware'], 'offset': metadata['offsets']['firmware']}
    ]
    
    if metadata.get('boot_app0') and Path(metadata['boot_app0']).exists():
        binaries.insert(2, {'path': metadata['boot_app0'], 'offset': metadata['offsets']['boot_app0']})
    
    merge_firmware(binaries, metadata['offsets'], merged_bin, metadata)
    
    print("Computing checksum...")
    sha256 = compute_sha256(merged_bin)
    
    checksum_file = firmware_dir / "SHA256SUMS.txt"
    with open(checksum_file, 'w') as f:
        f.write(f"{sha256}  {merged_bin.name}\n")
    
    print(f"SHA-256: {sha256}")
    
    print("Creating manifest...")
    manifest = create_manifest(release_id, f"./firmware/{release_id}/slimevr-bmi160-esp32-full.bin")
    
    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print("Copying site files...")
    copy_assets(site_dir, output_dir, release_id)
    
    print(f"\nDone! Release {release_id} ready in: {output_dir}")
    print(f"Files:")
    print(f"  - manifest.json")
    print(f"  - firmware/{release_id}/slimevr-bmi160-esp32-full.bin")
    print(f"  - firmware/{release_id}/SHA256SUMS.txt")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
