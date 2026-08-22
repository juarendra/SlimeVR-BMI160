# SlimeVR BMI160 Web Flasher Implementation Plan

## 1. Goal

Build and host a static web installer for Positron Electronic SlimeVR BMI160 trackers at:

```text
https://juarendra.github.io/SlimeVR-BMI160/
```

User flow:

1. Open site in supported desktop browser.
2. Connect ESP32 tracker through USB.
3. Flash one public, hardware-specific firmware build.
4. Enter 2.4 GHz WiFi SSID and password in browser.
5. Browser sends credentials directly to tracker over local USB serial.
6. Tracker persists credentials in ESP32 NVS and connects to WiFi.
7. Site confirms connection without sending credentials to GitHub or any server.

Firmware must retain repository-specific settings:

- ESP32 WROOM board.
- BMI160 IMU.
- `IMU_ROTATION DEG_180`.
- GPIO configuration from `src/defines.h`.
- Battery divider `R1 = 1.0 kOhm`, `R2 = 1.82 kOhm`.

## 2. Non-Goals

Do not implement these in first release:

- Compiling firmware in browser.
- Patching SSID/password strings inside `.bin` files.
- Sending WiFi credentials to GitHub Actions or any remote API.
- Captive portal, SoftAP configuration, or mobile flashing.
- Support for boards other than this repository's ESP32 WROOM + BMI160 profile.
- OTA firmware updates from website.
- User accounts, analytics, cookies, telemetry, or backend service.
- React, Vue, Next.js, Vite, Tailwind, package manager, or frontend build framework.

Reason: static HTML/CSS/JavaScript plus ESP Web Tools and existing serial protocol covers required flow with fewer failure modes.

## 3. Mandatory Security Gate

Do not publish or deploy firmware until all items below pass.

### 3.1 Rotate exposed WiFi passwords

Two private WiFi credential sets already exist in public source, Git history, and/or compiled firmware. Exact values are intentionally omitted from this plan.

Treat both passwords as compromised. Owner must change both router passwords before implementation continues. Git cleanup cannot make old passwords safe again.

### 3.2 Remove private credentials from public build

In `FIRMWARE/SlimeVR-Tracker-ESP/platformio.ini`, comment out or delete active flags:

```ini
-DWIFI_CREDS_SSID='"..."'
-DWIFI_CREDS_PASSWD='"..."'
```

Keep commented examples only:

```ini
;  -DWIFI_CREDS_SSID='"YOUR_WIFI_SSID"'
;  -DWIFI_CREDS_PASSWD='"YOUR_WIFI_PASSWORD"'
```

Public firmware must first try saved NVS credentials, then remain available for USB provisioning. It must never contain owner/customer credentials.

### 3.3 Replace credential-bearing compiled firmware

Existing `FIRMWARE/Compiled/BMI-160/firmware.bin` contains exposed WiFi credentials. Do not deploy it.

Preferred action:

- Remove manually committed generated binaries from active distribution.
- Build sanitized binaries in GitHub Actions.
- Publish only CI-built artifacts and Pages deployment output.

If binaries remain in repository for compatibility, replace them with sanitized CI output and document source commit plus SHA-256.

### 3.4 Secret checks

Before first deployment, scan current files and full history:

```powershell
gitleaks detect --source .
gitleaks detect --source . --log-opts="--all"
```

Current-tree scan must have no unresolved finding. Full-history findings for already-rotated credentials must be recorded in a reviewed baseline; CI then fails on any finding not in that immutable baseline. Never broadly allowlist paths or secret types. Also scan built firmware strings using exact leaked values supplied through a local, uncommitted denylist during remediation. Production CI must verify generic WiFi values are absent and fail on any current secret finding.

History rewrite is optional after password rotation and requires separate owner approval. Do not force-push history during this task unless explicitly approved.

## 4. Chosen Architecture

### 4.1 Flashing

Use ESP Web Tools for browser-to-ESP32 flashing. ESP Web Tools uses Web Serial and `esptool-js`, handles ESP bootloader control, progress, erase prompts, and serial port lifecycle.

Site supplies an ESP Web Tools manifest containing one sanitized merged ESP32 image at offset `0`.

Build merged image with pinned Espressif `esptool merge-bin`. Source component addresses and flash parameters from PlatformIO's generated upload command or board metadata, then compare them in verification. Current expected component layout is:

```text
0x1000   bootloader.bin
0x8000   partitions.bin
0xE000   boot_app0.bin
0x10000  firmware.bin
```

Never guess offsets or flash mode/frequency/size from this plan alone. Packaging must fail if generated metadata differs from expected values. ESP Web Tools manifest contains only merged image:

```text
offset 0   slimevr-bmi160-esp32-full.bin
```

### 4.2 WiFi provisioning

Use existing firmware serial command:

```text
SET BWIFI <BASE64_SSID> <BASE64_PASSWORD>\n
```

Relevant implementation:

- `FIRMWARE/SlimeVR-Tracker-ESP/src/serial/serialcommands.cpp`
- `FIRMWARE/SlimeVR-Tracker-ESP/src/network/wifihandler.cpp`

Why `SET BWIFI`, not `SET WIFI`:

- SSID and password may contain spaces or quotes.
- Base64 avoids command-parser quoting ambiguity.
- Browser can encode UTF-8 bytes before Base64.

Firmware must provide stable machine-readable responses without SSID/password:

```text
[WIFI-PROVISION] ACCEPTED
[WIFI-PROVISION] CONNECTED <IP>
[WIFI-PROVISION] FAILED <ERROR_CODE>
```

Allowed error codes are fixed identifiers such as `INVALID_INPUT`, `AUTH_TIMEOUT`, and `NETWORK_UNAVAILABLE`; never include credentials. `ACCEPTED` means input accepted, not network connected. Browser accepts success only from post-command `CONNECTED` response for current attempt.

### 4.3 Hosting

Use GitHub Pages through GitHub Actions. Deploy only generated `dist/` content. Never deploy repository root.

Site is static. WiFi credentials stay in page memory and travel only over local Web Serial.

## 5. Repository Layout

Create this minimum layout:

```text
SlimeVR-BMI160/
├── .github/
│   └── workflows/
│       └── pages.yml
├── site/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── manifest.json
│   ├── assets/
│   │   ├── board-mark.svg
│   │   └── favicon.svg
│   └── vendor/
│       └── esp-web-tools/
│           └── install-button.js
├── scripts/
│   ├── prepare_pages.py
│   └── verify_release.py
├── FIRMWARE/
│   └── SlimeVR-Tracker-ESP/
├── WEB_FLASHER_IMPLEMENTATION_PLAN.md
└── README.md
```

Generated deployment directory, never commit:

```text
dist/
├── index.html
├── styles.css
├── app.js
├── manifest.json
├── assets/
├── vendor/
└── firmware/
    └── <release-id>/
        ├── slimevr-bmi160-esp32-full.bin
        └── SHA256SUMS.txt
```

Create root `.gitignore` before packaging and add `/dist/`. Do not use lowercase `docs/`; repository already has uppercase `DOC/`, which conflicts on Windows case-insensitive filesystems.

## 6. Firmware Work

### 6.1 Sanitize build configuration

Edit `FIRMWARE/SlimeVR-Tracker-ESP/platformio.ini`:

1. Remove active WiFi credentials.
2. Preserve `[env:esp32]` settings.
3. Do not inject GitHub secrets into firmware build.
4. Keep OTA disabled for initial public web-flasher release unless owner explicitly defines fleet OTA policy.

### 6.2 Preserve custom hardware settings

Verify `FIRMWARE/SlimeVR-Tracker-ESP/src/defines.h` still contains:

```cpp
#define IMU IMU_BMI160
#define BOARD BOARD_WROOM32
#define IMU_ROTATION DEG_180
#define MAX_IMU_COUNT 1
#define BATTERY_MONITOR BAT_EXTERNAL
#define BATTERY_SHIELD_RESISTANCE 0
#define BATTERY_SHIELD_R1 1.0
#define BATTERY_SHIELD_R2 1.82
#define PIN_IMU_SDA 21
#define PIN_IMU_SCL 22
#define PIN_IMU_INT 23
#define PIN_BATTERY_LEVEL 34
```

Do not generalize these into user-selectable website options in first release.

### 6.3 Harden serial credential handling

Review and minimally fix these before publishing:

1. Reject malformed Base64 alphabet, padding, and length before decoding.
2. Reject encoded input large enough to allocate decoded buffers beyond SSID/password ceilings; never create variable-length stack arrays from unchecked input.
3. Decode into fixed-size arrays: SSID 33 bytes, password 65 bytes.
4. Validate decoded SSID is 1-32 bytes and password follows selected network-security policy.
5. Reject embedded decoded NUL, CR, and LF.
6. Ensure decoded buffers are always null-terminated.
7. Ensure command never prints raw SSID/password, Base64 credentials, or connected SSID.
8. Keep response text stable for browser parser.
9. Ensure a second `SET BWIFI` attempt works after first password fails.
10. Fix ESP32 `SLIME_WIFI_SERVER_CRED_ATTEMPT` timeout state so it does not remain stuck forever after failed credentials.
11. Add tracker identity response for `GET INFO` containing stable non-secret marker, firmware version, hardware profile, and protocol version.

Keep protocol backward-compatible. Do not add a new provisioning library in version 1.

Required stable machine-readable responses:

```text
[WIFI-PROVISION] ACCEPTED
[WIFI-PROVISION] CONNECTED <IP>
[WIFI-PROVISION] FAILED <ERROR_CODE>
```

Do not include SSID or password in these lines. Do not parse human logger text for provisioning success.

Version 1 network policy:

- Support WPA/WPA2 passphrases containing 8-63 UTF-8 bytes.
- Support 64-byte raw PSK only when every byte is ASCII hexadecimal.
- Do not advertise open-network support in version 1.
- Reject password lengths 0-7 and invalid 64-byte values before calling `WiFi.begin`.

### 6.4 Firmware checks

Run:

```powershell
pio run -e esp32
```

From:

```text
FIRMWARE/SlimeVR-Tracker-ESP
```

Required checks:

- Build exits `0`.
- `firmware.bin` fits `app0` partition.
- `esptool image-info` accepts bootloader and firmware images.
- Built binary does not contain known private SSID/password values.
- Serial `SET BWIFI` succeeds with SSID containing spaces.
- Oversized/malformed Base64, embedded NUL, and invalid password lengths are rejected without changing NVS or connection state.
- Wrong password can be retried without reflashing or rebooting.
- Correct credentials survive reboot through ESP32 NVS.

## 7. Website Behavior

### 7.1 State machine

Implement explicit states in `site/app.js`. Never infer UI state from button text.

```text
UNSUPPORTED_BROWSER
READY_TO_FLASH
FLASHING
FLASH_CANCELLED
FLASH_FAILED
FLASH_COMPLETE
READY_TO_PROVISION
SERIAL_CONNECTING
DEVICE_VERIFYING
DEVICE_REJECTED
SENDING_CREDENTIALS
WAITING_FOR_WIFI
CONNECTED
PROVISION_FAILED
DEVICE_DISCONNECTED
```

Only one state may be active. A single `renderState(state, detail)` function updates status label, progress, enabled controls, instructions, and live region.

Transitions:

```text
READY_TO_FLASH -> FLASHING -> FLASH_COMPLETE
FLASHING -> FLASH_CANCELLED | FLASH_FAILED
FLASH_COMPLETE -> READY_TO_PROVISION
READY_TO_FLASH -> READY_TO_PROVISION (explicit "Configure existing firmware" action)
READY_TO_PROVISION -> SERIAL_CONNECTING -> DEVICE_VERIFYING
DEVICE_VERIFYING -> SENDING_CREDENTIALS | DEVICE_REJECTED
SENDING_CREDENTIALS -> WAITING_FOR_WIFI
WAITING_FOR_WIFI -> CONNECTED
WAITING_FOR_WIFI -> PROVISION_FAILED
any connected state -> DEVICE_DISCONNECTED
PROVISION_FAILED -> READY_TO_PROVISION
FLASH_CANCELLED | FLASH_FAILED -> READY_TO_FLASH
DEVICE_REJECTED | DEVICE_DISCONNECTED -> READY_TO_PROVISION
```

### 7.2 Browser support gate

On load, test:

```js
window.isSecureContext && "serial" in navigator
```

Published support statement:

```text
Version 1 support: current desktop Google Chrome or Microsoft Edge on Windows.
Other operating systems, Safari, Firefox, and mobile browsers are not yet supported.
```

Do not hide unsupported state. Show direct instructions and disable flashing/provisioning actions.

### 7.3 Flash step

Use:

```html
<esp-web-install-button manifest="./manifest.json"></esp-web-install-button>
```

Requirements:

- User explicitly clicks Connect/Install.
- Manifest profile label says `Positron SlimeVR BMI160 (ESP32 WROOM)`.
- Warn that wrong hardware profile may require recovery.
- Explain whether erase preserves or removes calibration and old WiFi credentials.
- ESP Web Tools install button has no assumed host-page success event. Do not infer success from dialog close.
- Keep page state at flash operation while native dialog is open. After native dialog itself reports success, user explicitly clicks `Firmware installed - continue` to enter provisioning. Label makes this confirmation clear; it does not claim independent verification.
- Cancel/failure returns to flash instructions. Never mark dialog closure alone as success.
- After flash, instruct user to wait for USB serial port to reappear before provisioning.
- Always show secondary `Configure existing firmware` action so reload does not force another flash.

### 7.4 WiFi form

Fields:

- `SSID`, text input, required, `autocomplete="off"`, `spellcheck="false"`.
- `Password`, password input, required, `autocomplete="new-password"`.
- Show/hide password button with accessible label and `aria-pressed`.
- `Connect WiFi` primary button.

Validation:

- Trim neither SSID nor password; spaces can be valid.
- Encode input with `TextEncoder`.
- Validate encoded SSID byte length is 1-32.
- Validate WPA/WPA2 password as 8-63 UTF-8 bytes, or exactly 64 ASCII hexadecimal bytes.
- Reject `\r`, `\n`, and NUL before Base64 encoding.
- Report field-level error text linked with `aria-describedby`.
- Never include input values in errors.

Base64 helper must encode bytes, not JavaScript UTF-16 code units. Use a chunk-safe byte-to-binary conversion rather than `btoa(value)` directly.

### 7.5 Web Serial provisioning

Provisioning algorithm:

1. User clicks `Connect WiFi`; this user gesture calls `navigator.serial.requestPort()`.
2. Open selected port at `115200` baud.
3. Start read loop with `TextDecoderStream` or chunk-aware `TextDecoder`.
4. Accumulate serial data and split complete lines on `\n`; keep partial trailing line.
5. Discard startup lines from provisioning matcher, then send `GET INFO\n`.
6. Require stable tracker identity marker, expected `ESP32_WROOM_BMI160` hardware profile, and supported provisioning protocol version. Reject unknown/mismatched serial device before credentials are encoded or sent.
7. Encode SSID/password to UTF-8 bytes, then Base64.
8. Start a new attempt ID in page memory, reset matcher, and write exactly one command ending in LF:

   ```text
   SET BWIFI <base64-ssid> <base64-password>\n
   ```

9. Do not print command to console or UI.
10. Wait up to 5 seconds for post-command `[WIFI-PROVISION] ACCEPTED`.
11. After acknowledgment, wait up to 30 seconds for post-ack `[WIFI-PROVISION] CONNECTED <IP>` or `[WIFI-PROVISION] FAILED <ERROR_CODE>`.
12. Ignore stale connection lines received before current command acknowledgment.
13. On success, clear SSID/password variables and inputs.
14. On failure/timeout, retain SSID for convenience, always clear password and encoded password bytes, and show retry guidance without claiming exact cause unless firmware supplied a defined error code.
15. In `finally`, release reader/writer locks and close port unless keeping it open is required for active confirmation.

Open networks are unsupported in version 1. UI and firmware reject empty password.

Port handling:

- Handle chooser cancellation by returning to `READY_TO_PROVISION`, not fatal.
- Handle port already open by serial monitor.
- Handle USB disconnect during read/write.
- Handle board reset and USB re-enumeration after flash.
- Never automatically select an unconfirmed port for destructive flash.
- Never send credentials before successful device identity handshake.

### 7.6 Privacy behavior

Code must not use:

- `fetch()` for credentials.
- Query parameters or URL fragments for credentials.
- `localStorage`, `sessionStorage`, IndexedDB, cookies, Cache API, or service workers for credentials.
- Console logging of form values or serial command.
- Analytics, error-reporting SDKs, chat widgets, remote fonts, or third-party scripts.

After success, disconnect, or page unload:

- Set input values to empty strings.
- Clear encoded arrays where practical with `.fill(0)`.
- Drop command string references.

After provisioning failure, retain only SSID input; clear password and all encoded credential/command buffers.

## 8. UI Design Direction

### 8.1 Visual identity: Precision Electronics Workbench

Avoid generic SaaS dashboard, giant gradient headline, floating glass cards, excessive pills, and random glowing blobs.

Use visual language inspired by:

- PCB silkscreen labels.
- Bench instruments.
- Calibration sheets.
- Connector pin numbering.
- Restrained status LEDs.

Page should feel like trusted hardware tooling, not marketing landing page.

### 8.2 Layout

Desktop, `>= 960px`:

```text
┌──────────────────────────────────────────────────────────────┐
│ POSITRON / DEVICE UTILITY                  ESP32 · BMI160     │
├───────────────────┬──────────────────────────────────────────┤
│ Step rail         │ Active operation panel                   │
│ 01 Inspect        │ Title + exact instruction                │
│ 02 Flash          │ Device illustration / controls           │
│ 03 WiFi           │ Progress or form                         │
│ 04 Verify         │ Technical status transcript              │
├───────────────────┴──────────────────────────────────────────┤
│ Privacy statement · firmware version · source commit         │
└──────────────────────────────────────────────────────────────┘
```

- Max content width: `1120px`.
- Left rail: `240px`; right panel fills remaining width.
- Primary content left-aligned.
- Keep operation card visible above fold at 1366x768.
- Use CSS grid, no JavaScript layout.

Mobile, `< 760px`:

- Single column.
- Step rail becomes horizontal numbered strip with overflow-safe labels.
- Inputs and buttons use full width.
- Minimum touch target `44px`.
- No horizontal page scroll at `320px` width.

Tablet, `760px-959px`:

- Single main column with compact horizontal step rail.
- Use two-column form rows only when each field remains at least `280px` wide; otherwise stack fields.
- No fixed left rail.

### 8.3 Color tokens

Use one restrained palette:

```css
:root {
  --ink-950: #0b0e0d;
  --ink-900: #111614;
  --ink-850: #171d1a;
  --ink-800: #1e2622;
  --line: rgba(226, 232, 228, 0.12);
  --paper: #e8ece9;
  --muted: #98a39d;
  --signal: #b8f35a;
  --signal-dark: #263b18;
  --copper: #d58a52;
  --warning: #f2b84b;
  --danger: #ef6a62;
  --success: #70d49b;
}
```

Rules:

- Near-black green-gray background, not pure black.
- Off-white text, not pure white.
- Acid-lime signal color only for primary action, current step, and success detail.
- Copper only for small hardware accents.
- No rainbow gradients.
- Status always has icon/text, never color alone.

### 8.4 Typography

No external font requests. Use local system stacks:

```css
--font-ui: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
--font-mono: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
```

Hierarchy:

- Utility eyebrow: 12px mono, uppercase, `0.12em` tracking.
- Main heading: `clamp(32px, 5vw, 58px)`, weight 650, tight line height.
- Operation title: 24-30px.
- Body: 16px, max line length `65ch`.
- Technical status: 13-14px mono with tabular numbers.

Avoid using five unrelated font sizes. Define type tokens once.

### 8.5 Distinctive visual elements

Implement with CSS/SVG only:

- Thin PCB-trace line connecting step numbers.
- Optional after end-to-end acceptance: small board silhouette based on actual tracker proportions, not stock robot art.
- Optional after end-to-end acceptance: corner registration marks around active operation panel.
- Monospace hardware labels: `MCU/ESP32`, `IMU/BMI160`, `LINK/USB`.
- One restrained status LED beside live connection state.

Do not add decorative charts, fake statistics, 3D mockups, mascots, or generic shield icons.

### 8.6 Components

Required components:

- Header identity strip.
- Browser compatibility banner.
- Four-step progress rail.
- Firmware identity block showing hardware, version, Git commit, and binary checksum link.
- Flash action area wrapping ESP Web Tools button.
- WiFi credential form.
- Status transcript showing fixed allowlisted events only. Never insert raw serial text; render with `textContent`, never `innerHTML`.
- Recovery/help disclosure using native `<details>`.
- Footer privacy statement and source link.

Buttons:

- One filled primary action per state.
- Secondary actions use transparent surface and subtle line.
- Disable buttons during async operations.
- Visible `:focus-visible` ring, at least 2px.
- Hover movement maximum 1px; no bouncing or large scale animation.

### 8.7 Motion

- 160-220ms transitions for opacity, border color, and transform only.
- Progress bar may animate width.
- Status LED may use one subtle pulse only while waiting.
- Respect `prefers-reduced-motion: reduce` and disable nonessential motion.
- No perpetual background animation.

### 8.8 Accessibility

- Semantic landmarks: `header`, `main`, `nav`, `section`, `footer`.
- Form uses real `<label>` elements.
- Async status uses `role="status" aria-live="polite"`.
- Errors use `role="alert"` when immediate.
- Current step uses `aria-current="step"`.
- Contrast: WCAG AA minimum.
- Keyboard-only flow must complete all non-browser-native actions.
- Do not override ESP Web Tools dialog accessibility.
- Password reveal button must not steal or reset field value.

## 9. Static Assets and Dependency Policy

### 9.1 ESP Web Tools

Prefer self-hosting a pinned release of `install-button.js` and its required module graph under `site/vendor/esp-web-tools/`.

Execution rules:

1. Select a specific tested ESP Web Tools version.
2. Record version and upstream URL in `site/vendor/esp-web-tools/README.md`.
3. Preserve upstream license notices.
4. Do not use unpinned `@latest` CDN URL.
5. If self-hosting module graph proves impractical, pin exact package version on CDN and document temporary exception. Never use floating version.

No other runtime third-party JavaScript.

### 9.2 Content Security Policy

GitHub Pages cannot freely set all response headers. Add a restrictive HTML CSP meta tag compatible with actual module loading:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
```

`frame-ancestors` is intentionally omitted because browsers ignore it in CSP meta tags and GitHub Pages cannot set custom CSP response headers. Document clickjacking-header limitation. Adjust other directives only if pinned ESP Web Tools dependency requires it. Do not add `unsafe-eval`. Avoid inline scripts/styles so `unsafe-inline` is unnecessary.

## 10. Manifest and Firmware Packaging

### 10.1 Manifest

`site/manifest.json` should resemble:

```json
{
  "name": "Positron SlimeVR BMI160",
  "version": "<release-id>",
  "new_install_prompt_erase": true,
  "new_install_improv_wait_time": 0,
  "builds": [
    {
      "chipFamily": "ESP32",
      "serialType": "uart",
      "parts": [
        { "path": "./firmware/<release-id>/slimevr-bmi160-esp32-full.bin", "offset": 0 }
      ]
    }
  ]
}
```

`new_install_improv_wait_time` is `0` because version 1 uses custom `SET BWIFI`, not Improv Serial.

Generate canonical release ID once from short Git commit, for example:

```text
positron-abc1234
```

Do not hand-edit release IDs in multiple files. Packaging script receives full commit SHA, derives `positron-<short-sha>`, and writes same value to manifest, page metadata, artifact directory, and checksum metadata. Firmware's existing embedded Git version remains separate and must report same full source commit through `GET INFO`.

### 10.2 Packaging script

Implement `scripts/prepare_pages.py` with Python 3.11. Do not add an alternative PowerShell path. Responsibilities:

1. Accept build directory, site directory, output directory, and release ID parameters.
2. Verify parent/output paths before creating directories.
3. Delete only generated output directory passed explicitly; guard against empty/root path.
4. Copy static site files into `dist/`.
5. Read exact PlatformIO upload metadata and locate bootloader, partition, `boot_app0`, and app images.
6. Invoke pinned `esptool merge-bin` with verified chip, addresses, flash mode, flash frequency, and flash size.
7. Write one merged image into immutable version directory.
8. Generate manifest at offset `0`.
9. Generate SHA-256 file.
10. Replace only declared release placeholders.
11. Exit nonzero on missing files, metadata mismatch, duplicate manifest profiles, or stale credentials.

Do not use script to edit tracked firmware source.

### 10.3 Verification script

Implement `scripts/verify_release.py` with Python 3.11. It must check:

- Every manifest path exists under `dist/`.
- Manifest has exactly one image at integer offset `0`.
- `chipFamily` equals `ESP32`.
- Firmware version in page and manifest match.
- SHA-256 file matches binaries.
- Known exposed credentials do not occur in text or binary output.
- No absolute local Windows paths occur in deployed text files.
- No remote scripts/fonts/images occur unless explicitly allowlisted.
- No source maps containing secrets are emitted.

## 11. GitHub Actions

Create `.github/workflows/pages.yml` with three jobs.

### 11.1 Triggers

```yaml
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
```

### 11.2 `firmware` job

Responsibilities:

1. Checkout repository.
2. Set up pinned Python version `3.11`.
3. Install pinned PlatformIO `6.1.19`.
4. Cache PlatformIO packages keyed by OS and firmware config hashes.
5. Build only `esp32` environment from active firmware directory.
6. Run image and secret checks.
7. Upload sanitized firmware artifacts for later job.

Working directory:

```text
FIRMWARE/SlimeVR-Tracker-ESP
```

Build command:

```text
pio run -e esp32
```

### 11.3 `site-test` job

Depends on `firmware`.

Responsibilities:

1. Download firmware artifact.
2. Run `python scripts/prepare_pages.py`.
3. Run `python scripts/verify_release.py`.
4. Validate HTML.
5. Serve `dist/` locally and run browser-independent smoke checks for HTTP 200 on page, manifest, and every binary.
6. Upload `dist/` as Pages artifact only on `main`, not pull requests.

### 11.4 `deploy` job

Conditions:

```text
github.ref == refs/heads/main
event is push or workflow_dispatch
firmware and site-test succeeded
```

Set workflow-level default `permissions: { contents: read }`. Only `deploy` job receives:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

Use GitHub Pages environment and deployment concurrency group. Deploy only `dist/`.

### 11.5 Supply-chain requirements

- Pin GitHub Actions to reviewed full commit SHAs before production.
- Add comments showing friendly action version beside SHA.
- Pin PlatformIO and firmware Git dependencies to tags or commit SHAs.
- Do not expose repository secrets to pull requests.
- Do not build customer-specific credentials in CI.

## 12. Documentation Updates

### 12.1 Root README

Update WiFi section. Remove false statement that every SSID change requires firmware reflash.

New primary path:

1. Open hosted web flasher.
2. Flash generic custom firmware.
3. Provision WiFi over USB from same page.

Keep PlatformIO manual path under developer documentation.

Add:

- Hosted site URL.
- Supported browser/OS statement.
- Supported hardware profile.
- 2.4 GHz WiFi requirement.
- Privacy statement: credentials remain local in browser-to-device serial connection.
- Recovery link.

### 12.2 Firmware guide

Edit exactly `FIRMWARE/README.md`.

Correct current documentation mismatches:

- Environment is `[env:esp32]`, not `[env:esp32dev]`.
- Macros are `WIFI_CREDS_SSID` and `WIFI_CREDS_PASSWD`, not `WIFI_SSID` and `WIFI_PASSWORD`.
- Hardcoding is developer fallback, not recommended customer flow.
- Document `SET BWIFI` only as technical recovery interface; do not ask normal users to type Base64.

`FIRMWARE/SlimeVR-Tracker-ESP/README.md` remains upstream firmware documentation. `FIRMWARE/SlimeVR-Tracker-ESP-0.4.0/` is legacy/non-authoritative and must not be edited or built.

### 12.3 Site recovery instructions

Include concise recovery `<details>` sections:

- Browser cannot see serial port.
- Driver/USB cable issue.
- Serial port is busy in PlatformIO/SlimeVR Server.
- Flash failed midway.
- Wrong WiFi password.
- WiFi is 5 GHz only.
- Tracker does not appear in SlimeVR Server.

Do not blame user. Give exact next action per case.

## 13. Test Plan

### 13.1 Automated firmware tests

- Clean build on fresh GitHub runner.
- Verify binary image metadata.
- Verify app size fits partition.
- Verify known credentials absent.
- Verify merged-image source addresses and flash parameters match PlatformIO upload metadata; verify manifest offset is `0`.
- Verify deterministic static site packaging.

### 13.2 JavaScript unit-level checks

Without adding test framework, create a small browser-runnable assertion file only if helpers become non-trivial. Required cases:

- UTF-8 Base64 for ASCII.
- UTF-8 Base64 for non-ASCII SSID.
- 32-byte SSID accepted; 33-byte rejected.
- 8-byte and 63-byte passphrases accepted; 1-7 and 65-byte values rejected.
- 64-byte ASCII hexadecimal PSK accepted; non-hex 64-byte value rejected.
- Newline and NUL rejected.
- Malformed/oversized Base64 rejected before allocation and without NVS changes.
- Serial line parser handles split chunks.
- Serial line parser handles multiple lines in one chunk.
- Stale pre-command success line cannot satisfy current attempt.
- Unknown serial device is rejected before credential encoding/transmission.
- Credential command is never passed to transcript logger.

### 13.3 Browser tests

Required before release:

- Latest Chrome desktop on Windows.
- Latest Edge desktop on Windows.
- Unsupported state in Safari or browser without Web Serial.
- Port chooser cancel.
- Port busy by serial monitor.
- USB disconnect during flash.
- USB disconnect during provisioning.
- Page reload between flash and provisioning.
- Keyboard-only operation.
- `prefers-reduced-motion` behavior.
- Responsive layout at 320, 375, 768, 1024, and 1440 px widths.

### 13.4 Hardware tests

Use actual production board with FTDI FT231XS plus at least one spare/recovery board.

Scenarios:

1. Blank ESP32 flash.
2. Existing repository firmware without erase.
3. Existing firmware with full erase.
4. Correct WiFi credentials.
5. Wrong password followed by corrected password.
6. SSID containing spaces.
7. Maximum allowed SSID/password byte lengths.
8. Reboot after successful provisioning.
9. Router unavailable during setup, then available.
10. Power loss during flash, then ROM bootloader recovery.

Erase expectations:

- Recommend full erase for first install or recovery. It removes NVS WiFi credentials and LittleFS calibration; UI must warn before user opens installer.
- Non-erase install is advanced path. Verify app updates while existing NVS/LittleFS remain; never promise preservation until physical test passes.
- Record both outcomes in release evidence.

Verify after connection:

- Tracker receives DHCP IP.
- Credentials survive reboot.
- BMI160 initializes.
- Orientation remains correct.
- Battery debug/result matches expected divider.
- Tracker appears in SlimeVR Server.

### 13.5 Privacy tests

With browser DevTools open:

- Network panel contains no SSID/password.
- Console contains no SSID/password or Base64 equivalents.
- Application storage contains no credentials.
- URL never changes to include credentials.
- Page source and deployed binaries contain no owner/customer credentials.

## 14. Acceptance Criteria

Release is complete only when all criteria pass:

- GitHub Pages loads over HTTPS at project URL.
- Desktop Chrome and Edge show supported installer.
- Unsupported browsers show clear non-destructive guidance.
- Correct firmware profile is clearly identified as ESP32 WROOM + BMI160.
- Browser flashes sanitized firmware to actual board.
- User enters WiFi credentials after flash.
- Credentials travel only over Web Serial.
- Correct credentials produce connected status within defined timeout.
- Wrong credentials show retry state without reflash.
- Credentials survive tracker reboot.
- Custom IMU orientation and battery divider remain correct.
- Tracker connects to SlimeVR Server.
- UI passes keyboard, focus, contrast, reduced-motion, and 320px layout checks.
- README links to web flasher and manual recovery path.
- CI builds firmware, verifies release, and deploys only after successful checks.
- No known private credentials exist in deployed source or binary.
- Unknown serial device is rejected before any credential transmission.
- Malformed/oversized provisioning input is rejected without stack growth, NVS change, or reconnect attempt.
- Open network is clearly unsupported; WPA/WPA2 validation matches firmware.
- Flash cancel/failure and serial disconnect return to safe retry states.
- Reloaded page offers direct existing-firmware provisioning without another flash.
- Stale serial output cannot produce false success.
- Full-erase and non-erase effects on NVS/LittleFS are documented from physical tests.
- Human owner signs off recorded FT231XS hardware test evidence: date, board revision, browser version, firmware commit, result, and relevant sanitized logs/screenshots.

## 15. Execution Order for Lower-Capability Agent

Follow order exactly. Do not begin next phase if current phase checks fail.

### Phase 0: Safety and baseline

1. Confirm owner rotated exposed passwords.
2. Run `git status`, `git diff`, and inspect current branch.
3. Fetch remote and verify PR #1 is merged. Base new branch on remote default branch commit containing battery commit `eaff1fe` or its merged descendant. If `origin/main` lacks that change, stop and reconcile branch history without reset/force-push; do not drop battery-divider/orientation work.
4. Create branch `feat/web-firmware-installer` from verified base.
5. Do not modify unrelated user changes.
6. Record baseline firmware build result.

Exit condition: clean understanding of branch and successful baseline build, or documented existing build failure.

### Phase 1: Sanitize and harden firmware

1. Remove active hardcoded WiFi credentials.
2. Fix serial provisioning validation and ESP32 failed-credential retry behavior.
3. Preserve all hardware defines.
4. Build firmware.
5. Flash physical tracker manually.
6. Test `SET BWIFI` through serial monitor.
7. Confirm NVS persistence.

Exit condition: generic firmware can receive and retry WiFi credentials over serial.

Suggested commit:

```text
fix(firmware): harden WiFi provisioning
```

### Phase 2: Build static UI

1. Create semantic `site/index.html` structure.
2. Create design tokens and responsive layout in `site/styles.css`.
3. Implement state machine, validation, UTF-8 Base64, and serial parser in `site/app.js`.
4. Add pinned ESP Web Tools dependency and license note.
5. Add initial manifest placeholder consumed by packaging script.
6. Test locally without credentials in logs/storage.

Exit condition: UI states and serial provisioning work against already-flashed hardware.

Suggested commit:

```text
feat(web): add tracker installer interface
```

### Phase 3: Package firmware for web flashing

1. Implement preparation and verification scripts.
2. Capture exact PlatformIO addresses and flash parameters.
3. Merge required images into one full image at offset `0`.
4. Generate manifest and checksums.
5. Serve `dist/` locally over HTTP.
6. Flash actual board using local site.
7. Complete end-to-end WiFi setup.

Exit condition: blank/recoverable board flashes and connects from local static site.

Suggested commit:

```text
build(web): package ESP32 firmware artifacts
```

### Phase 4: CI and GitHub Pages

1. Add pinned GitHub Actions workflow.
2. Validate workflow on pull request.
3. Ensure Pages deploy job does not run on pull requests.
4. Enable `Settings -> Pages -> Source: GitHub Actions`.
5. Merge only after firmware/site checks pass.
6. Verify production URL and manifest binary downloads.

Exit condition: `main` deployment succeeds and hosted end-to-end hardware test passes.

Suggested commit:

```text
ci(pages): deploy web firmware installer
```

### Phase 5: Documentation and release

1. Update exactly root `README.md` and `FIRMWARE/README.md`.
2. Add version/checksum display.
3. Run full acceptance test.
4. Review `git diff` for credentials and unrelated changes.
5. Push branch.
6. Create pull request with test evidence and hosted preview limitations.
7. Merge after review and successful CI.
8. Test production Pages URL with real hardware.

Suggested commit:

```text
docs: add browser flashing guide
```

## 16. Pull Request Checklist

PR description must include:

- Problem solved.
- Supported hardware profile.
- Firmware source commit.
- Flash offsets and how they were verified.
- Security statement that no private WiFi credentials are embedded.
- Browser support matrix.
- Actual hardware test results.
- Screenshots at desktop and mobile widths.
- Accessibility checks.
- Recovery procedure tested.
- Pages URL after merge.

Before push/PR:

```powershell
git config user.email "jrjuarendra@gmail.com"
git status
git diff --check
git diff origin/main...HEAD
git log --oneline -10
```

Do not force-push, rewrite history, or merge directly without explicit owner request.

## 17. Future Upgrade, Not Version 1

After version 1 is stable, consider replacing custom `SET BWIFI` browser integration with Improv Serial firmware support. ESP Web Tools can then own flash and WiFi provisioning in one native dialog and support later `Change Wi-Fi` flow.

Add Improv only when:

- Current web flasher has stable hardware coverage.
- Protocol implementation has malformed-frame tests.
- Existing text serial commands remain compatible.
- Firmware size still fits OTA partition.

Do not add Improv dependency during first release merely for UI convenience.
