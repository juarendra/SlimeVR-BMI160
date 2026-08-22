"""
Site Release Verifier - Check packaged firmware for safety and correctness
<<<<<<< HEAD
=======
Usage: python verify_release.py --dist-dir <dist>
>>>>>>> origin/main
"""

import argparse
import hashlib
import json
<<<<<<< HEAD
=======
import os
>>>>>>> origin/main
import re
import sys
from pathlib import Path


def check_file_exists(filepath: Path, desc: str) -> bool:
<<<<<<< HEAD
    if not filepath.exists():
        print(f"  X {desc}: {filepath} NOT FOUND")
        return False
    print(f"  V {desc}: {filepath}")
=======
    """Check if file exists and report."""
    if not filepath.exists():
        print(f"  ❌ {desc}: {filepath} NOT FOUND")
        return False
    print(f"  ✓ {desc}: {filepath}")
>>>>>>> origin/main
    return True


def verify_manifest(manifest_path: Path) -> bool:
<<<<<<< HEAD
    if not check_file_exists(manifest_path, "manifest.json"):
        return False
    
    with open(manifest_path, "r") as f:
=======
    """Verify ESP Web Tools manifest structure."""
    if not check_file_exists(manifest_path, "manifest.json"):
        return False
    
    with open(manifest_path, 'r') as f:
>>>>>>> origin/main
        manifest = json.load(f)
    
    errors = []
    
<<<<<<< HEAD
    required = ["name", "version", "builds"]
=======
    # Check required fields
    required = ['name', 'version', 'builds']
>>>>>>> origin/main
    for field in required:
        if field not in manifest:
            errors.append(f"Missing field: {field}")
    
<<<<<<< HEAD
    if "builds" in manifest:
        if len(manifest["builds"]) != 1:
            errors.append(f"Expected 1 build, found {len(manifest['builds'])}")
        else:
            build = manifest["builds"][0]
            
            if build.get("chipFamily") != "ESP32":
                errors.append(f"chipFamily should be ESP32, found: {build.get('chipFamily')}")
            
            if "parts" not in build or len(build["parts"]) != 1:
                errors.append("Expected exactly 1 part in build")
            else:
                part = build["parts"][0]
                if part.get("offset") != 0:
                    errors.append(f"Part offset should be 0, found: {part.get('offset')}")
    
    if errors:
        print("  X Manifest validation errors:")
=======
    # Verify builds structure
    if 'builds' in manifest:
        if len(manifest['builds']) != 1:
            errors.append(f"Expected 1 build, found {len(manifest['builds'])}")
        else:
            build = manifest['builds'][0]
            
            if build.get('chipFamily') != 'ESP32':
                errors.append(f"chipFamily should be ESP32, found: {build.get('chipFamily')}")
            
            if 'parts' not in build or len(build['parts']) != 1:
                errors.append("Expected exactly 1 part in build")
            else:
                part = build['parts'][0]
                if part.get('offset') != 0:
                    errors.append(f"Part offset should be 0, found: {part.get('offset')}")
    
    if errors:
        print("  ❌ Manifest validation errors:")
>>>>>>> origin/main
        for e in errors:
            print(f"     - {e}")
        return False
    
<<<<<<< HEAD
    print("  V Manifest structure valid")
=======
    print("  ✓ Manifest structure valid")
>>>>>>> origin/main
    return True


def check_secret_in_file(filepath: Path, secrets: list) -> list:
<<<<<<< HEAD
    found = []
    
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        
        try:
            text = content.decode("utf-8", errors="ignore")
            for secret in secrets:
                if secret.lower() in text.lower():
                    found.append(f"{filepath}: contains secret")
        except:
            pass
    except:
=======
    """Check if file contains any secret values."""
    found = []
    
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Try as text
        try:
            text = content.decode('utf-8', errors='ignore')
            for secret in secrets:
                if secret.lower() in text.lower():
                    found.append(f"{filepath}: contains '{secret[:4]}...'")
        except:
            pass
        
        # Check binary for ASCII strings
        try:
            text = content.decode('latin-1')
            for secret in secrets:
                if secret in text:
                    found.append(f"{filepath}: contains '{secret[:4]}...'")
        except:
            pass
            
    except Exception as e:
>>>>>>> origin/main
        pass
    
    return found


def scan_directory(dirpath: Path, secrets: list) -> list:
<<<<<<< HEAD
    all_found = []
    
    for item in dirpath.rglob("*"):
=======
    """Recursively scan directory for secrets."""
    all_found = []
    
    for item in dirpath.rglob('*'):
>>>>>>> origin/main
        if item.is_file():
            found = check_secret_in_file(item, secrets)
            all_found.extend(found)
    
    return all_found


def verify_no_secrets(dist_dir: Path) -> bool:
<<<<<<< HEAD
=======
    """Verify no WiFi credentials in packaged files."""
    # Known secret patterns to check (placeholder values)
    # In production, these would be the actual leaked credentials
>>>>>>> origin/main
    test_secrets = [
        "YOUR_WIFI_SSID",
        "YOUR_WIFI_PASSWORD",
        "testssid",
        "testpassword",
        "12345678",
    ]
    
    found = scan_directory(dist_dir, test_secrets)
    
    if found:
<<<<<<< HEAD
        print("  X Found potential secrets")
        return False
    
    print("  V No credentials found in package")
=======
        print("  ❌ Found potential secrets:")
        for f in found:
            print(f"     {f}")
        return False
    
    print("  ✓ No credentials found in package")
>>>>>>> origin/main
    return True


def check_absolute_paths(dirpath: Path) -> list:
<<<<<<< HEAD
    found = []
    pattern = re.compile(r"[A-Za-z]:\\[\\/\\w]")
    
    for item in dirpath.rglob("*"):
        if item.is_file() and item.suffix in [".js", ".json", ".html", ".css", ".md", ".txt"]:
            try:
                with open(item, "r", encoding="utf-8") as f:
=======
    """Check for Windows absolute paths in text files."""
    found = []
    pattern = re.compile(r'[A-Za-z]:\\[\\/\w]')
    
    for item in dirpath.rglob('*'):
        if item.is_file() and item.suffix in ['.js', '.json', '.html', '.css', '.md', '.txt']:
            try:
                with open(item, 'r', encoding='utf-8') as f:
>>>>>>> origin/main
                    content = f.read()
                
                if pattern.search(content):
                    found.append(str(item))
            except:
                pass
    
    return found


def verify_no_windows_paths(dist_dir: Path) -> bool:
<<<<<<< HEAD
    found = check_absolute_paths(dist_dir)
    
    if found:
        print("  X Found Windows absolute paths")
        return False
    
    print("  V No Windows absolute paths in output")
=======
    """Verify no Windows absolute paths in output."""
    found = check_absolute_paths(dist_dir)
    
    if found:
        print("  ❌ Found Windows absolute paths:")
        for f in found:
            print(f"     {f}")
        return False
    
    print("  ✓ No Windows absolute paths in output")
>>>>>>> origin/main
    return True


def verify_http_assets(dist_dir: Path) -> bool:
<<<<<<< HEAD
    errors = []
    
    manifest_path = dist_dir / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        
        for build in manifest.get("builds", []):
            for part in build.get("parts", []):
                part_path = dist_dir / part.get("path", "")
=======
    """Verify all HTTP assets are accessible."""
    errors = []
    
    # Check manifest references
    manifest_path = dist_dir / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        for build in manifest.get('builds', []):
            for part in build.get('parts', []):
                part_path = dist_dir / part.get('path', '')
>>>>>>> origin/main
                if not part_path.exists():
                    errors.append(f"Missing: {part.get('path')}")
    
    if errors:
<<<<<<< HEAD
        print("  X Missing referenced assets:")
=======
        print("  ❌ Missing referenced assets:")
>>>>>>> origin/main
        for e in errors:
            print(f"     - {e}")
        return False
    
<<<<<<< HEAD
    print("  V All referenced assets present")
=======
    print("  ✓ All referenced assets present")
    return True


def verify_remote_resources(site_dir: Path) -> bool:
    """Verify no remote resources (except allowed)."""
    index_path = site_dir / "index.html"
    if not index_path.exists():
        index_path = site_dir / "index.html"
    
    allowed_domains = [
        "unpkg.com",
        "github.com",
        "github.io",
    ]
    
    found_remote = []
    
    if index_path.exists():
        with open(index_path, 'r') as f:
            content = f.read()
        
        # Check for remote script/src links
        import re
        script_pattern = re.compile(r'<script[^>]*src=["\']([^"\']+)["\']', re.IGNORECASE)
        for match in script_pattern.finditer(content):
            src = match.group(1)
            is_allowed = any(domain in src for domain in allowed_domains)
            if not is_allowed:
                found_remote.append(src)
    
    if found_remote:
        print("  ⚠️  Remote resources (review needed):")
        for r in found_remote:
            print(f"     {r}")
        # Not an error for MVP, but should be reviewed
        return True
    
    print("  ✓ No unauthorized remote resources")
>>>>>>> origin/main
    return True


def main():
<<<<<<< HEAD
    parser = argparse.ArgumentParser(description="Verify ESP Web Tools release package")
    parser.add_argument("--dist-dir", required=True, help="Dist output directory")
=======
    parser = argparse.ArgumentParser(description='Verify ESP Web Tools release package')
    parser.add_argument('--dist-dir', required=True, help='Dist output directory')
>>>>>>> origin/main
    
    args = parser.parse_args()
    
    dist_dir = Path(args.dist_dir)
    
    if not dist_dir.exists():
        print(f"Dist directory not found: {dist_dir}")
        sys.exit(1)
    
    print(f"Verifying release package: {dist_dir}")
    print()
    
    results = []
    
    print("[1/6] Checking manifest structure...")
    results.append(verify_manifest(dist_dir / "manifest.json"))
    print()
    
    print("[2/6] Checking firmware binary...")
    manifest_path = dist_dir / "manifest.json"
    if manifest_path.exists():
<<<<<<< HEAD
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        
        for build in manifest.get("builds", []):
            for part in build.get("parts", []):
                part_path = dist_dir / part.get("path", "")
=======
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        for build in manifest.get('builds', []):
            for part in build.get('parts', []):
                part_path = dist_dir / part.get('path', '')
>>>>>>> origin/main
                results.append(check_file_exists(part_path, f"Binary: {part.get('path')}"))
    print()
    
    print("[3/6] Checking for credentials...")
    results.append(verify_no_secrets(dist_dir))
    print()
    
    print("[4/6] Checking for Windows paths...")
    results.append(verify_no_windows_paths(dist_dir))
    print()
    
    print("[5/6] Verifying HTTP assets...")
    results.append(verify_http_assets(dist_dir))
    print()
    
<<<<<<< HEAD
=======
    print("[6/6] Checking remote resources...")
    results.append(verify_remote_resources(dist_dir.parent / "site"))
    print()
    
>>>>>>> origin/main
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"Results: {passed}/{total} checks passed")
    
    if passed == total:
<<<<<<< HEAD
        print("\nRelease package is valid for deployment")
        sys.exit(0)
    else:
        print(f"\n{total - passed} check(s) failed")
=======
        print("\n✅ Release package is valid for deployment")
        sys.exit(0)
    else:
        print(f"\n❌ {total - passed} check(s) failed")
>>>>>>> origin/main
        sys.exit(1)
