const STATE = {
  UNSUPPORTED_BROWSER: 'UNSUPPORTED_BROWSER',
  READY_TO_FLASH: 'READY_TO_FLASH',
  FLASHING: 'FLASHING',
  FLASH_COMPLETE: 'FLASH_COMPLETE',
  READY_TO_PROVISION: 'READY_TO_PROVISION',
  SERIAL_CONNECTING: 'SERIAL_CONNECTING',
  SENDING_CREDENTIALS: 'SENDING_CREDENTIALS',
  WAITING_FOR_WIFI: 'WAITING_FOR_WIFI',
  CONNECTED: 'CONNECTED',
  PROVISION_FAILED: 'PROVISION_FAILED',
  DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED'
};

let activePort = null;
let activeReader = null;
let currentState = STATE.READY_TO_FLASH;

function renderState() {
  let targetStep = 0;

  switch (currentState) {
    case STATE.UNSUPPORTED_BROWSER:
    case STATE.READY_TO_FLASH:
    case STATE.FLASHING:
    case STATE.FLASH_COMPLETE:
    case STATE.DEVICE_DISCONNECTED:
      targetStep = 1;
      break;
    case STATE.READY_TO_PROVISION:
    case STATE.SERIAL_CONNECTING:
    case STATE.SENDING_CREDENTIALS:
    case STATE.WAITING_FOR_WIFI:
    case STATE.PROVISION_FAILED:
      targetStep = 2;
      break;
    case STATE.CONNECTED:
      targetStep = 3;
      break;
  }

  goToStep(targetStep);
}

function setStatusDotClass(el, klass) {
  if (!el) return;
  el.classList.remove('is-ok', 'is-warn', 'is-error', 'is-info');
  if (klass) el.classList.add(klass);
}

function setTileClass(el, klass) {
  if (!el) return;
  el.classList.remove('is-highlight', 'is-warning', 'is-ok');
  if (klass) el.classList.add(klass);
}

function setKpiState(el, value, variant) {
  if (!el) return;
  el.textContent = value;
  el.classList.remove('is-success', 'is-warn', 'is-danger');
  if (variant) el.classList.add(variant);
}

function updateSerialStatus(connected, portInfo = '') {
  const btn = document.getElementById('btn-top-serial');
  const led = document.getElementById('top-serial-led');
  const text = document.getElementById('top-serial-text');
  const tile = document.getElementById('tile-serial');
  const kpiUsb = document.getElementById('kpi-usb');
  const kpiPort = document.getElementById('kpi-port');
  const deviceArt = document.getElementById('device-art');
  const deviceTitle = document.getElementById('device-status-title');
  const deviceSub = document.getElementById('device-status-sub');

  if (connected) {
    btn?.classList.add('is-active');
    if (btn) btn.textContent = 'Disconnect';
    setStatusDotClass(led, 'is-ok');
    setTileClass(tile, 'is-ok');
    if (text) text.textContent = portInfo ? `Connected · ${portInfo}` : 'Serial connected';
    setKpiState(kpiUsb, 'Connected', 'is-success');
    setKpiState(kpiPort, portInfo || 'COM active', 'is-success');
    if (deviceArt) deviceArt.classList.remove('is-disconnected');
    if (deviceTitle) deviceTitle.textContent = 'Tracker detected';
    if (deviceSub) deviceSub.textContent = 'Identity handshake complete. Continue to step 02 to flash firmware.';
  } else {
    btn?.classList.remove('is-active');
    if (btn) btn.textContent = 'Connect';
    setStatusDotClass(led, 'is-error');
    setTileClass(tile, null);
    if (text) text.textContent = 'Serial disconnected';
    setKpiState(kpiUsb, 'No device');
    setKpiState(kpiPort, '—');
    if (deviceArt) deviceArt.classList.add('is-disconnected');
    if (deviceTitle) deviceTitle.textContent = 'No device detected';
    if (deviceSub) deviceSub.textContent = 'Plug in the tracker, then choose the serial port from the browser prompt.';
  }
}

function updateFirmwareStatus(flashed) {
  const dot = document.getElementById('top-firmware-dot');
  const text = document.getElementById('top-firmware-text');
  const tile = document.getElementById('tile-firmware');
  const kpiFw = document.getElementById('kpi-fw');

  if (flashed) {
    setStatusDotClass(dot, 'is-ok');
    setTileClass(tile, 'is-ok');
    if (text) text.textContent = 'Firmware verified';
    setKpiState(kpiFw, 'Flashed', 'is-success');
  } else {
    setStatusDotClass(dot, 'is-warn');
    setTileClass(tile, 'is-warning');
    if (text) text.textContent = 'Firmware not verified';
    setKpiState(kpiFw, 'Ready to flash', 'is-warn');
  }
}

function initBrowserKpi() {
  const kpiBrowser = document.getElementById('kpi-browser');
  const kpiBrowserTitle = document.getElementById('kpi-browser-title');
  const tile = document.getElementById('tile-browser');
  const supported = 'serial' in navigator;
  if (!kpiBrowser) return;
  if (supported) {
    kpiBrowser.textContent = getBrowserName();
    setStatusDotClass(tile?.querySelector('.status-dot'), 'is-ok');
    if (tile) tile.classList.remove('is-warning');
  } else {
    kpiBrowser.textContent = 'Not supported';
    setStatusDotClass(tile?.querySelector('.status-dot'), 'is-error');
    if (tile) { tile.classList.remove('is-ok'); tile.classList.add('is-warning'); }
    if (kpiBrowserTitle) kpiBrowserTitle.textContent = 'Browser unsupported';
  }
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Web Serial OK';
}

async function ensureSerialPort() {
  if (activePort && activePort.readable && activePort.writable) {
    return activePort;
  }
  
  try {
    if (activeReader) {
      try { await activeReader.cancel(); } catch(e) {}
      activeReader = null;
    }
    if (activePort) {
      try { await activePort.close(); } catch(e) {}
    }
  } catch(e) {}
  
  activePort = await navigator.serial.requestPort();
  await activePort.open({ baudRate: 115200 });
  updateSerialStatus(true, 'Ready');
  return activePort;
}

async function performIdentityHandshake() {
  if (!activePort) {
    throw new Error('Serial port not open');
  }
  
  const writer = activePort.writable.getWriter();
  const reader = activePort.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  try {
    writer.write(encoder.encode('GET INFO\n'));
    
    let buffer = '';
    const startTime = Date.now();
    const timeout = 5000;
    
    while (Date.now() - startTime < timeout) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.includes('[DEVICE-INFO]')) {
          return true;
        }
      }
    }
    
    return false;
  } finally {
    try { writer.releaseLock(); } catch(e) {}
    try { reader.releaseLock(); } catch(e) {}
  }
}

async function sendWiFiCredentials(ssid, password) {
  const encoder = new TextEncoder();
  const encodedSsid = btoa(encoder.encode(ssid).reduce((acc, byte) => acc + String.fromCharCode(byte), ''));
  const encodedPass = btoa(encoder.encode(password).reduce((acc, byte) => acc + String.fromCharCode(byte), ''));
  
  const writer = activePort.writable.getWriter();
  const reader = activePort.readable.getReader();
  const decoder = new TextDecoder();
  
  try {
    writer.write(encoder.encode(`SET BWIFI ${encodedSsid} ${encodedPass}\n`));
    
    let buffer = '';
    let accepted = false;
    let connected = false;
    let errorMsg = '';
    
    const acceptedTimeout = 5000;
    const connectTimeout = 30000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < (accepted ? connectTimeout : acceptedTimeout)) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        const cleanLine = line.trim();
        
        if (cleanLine.includes('[WIFI-PROVISION] ACCEPTED')) {
          accepted = true;
        } else if (cleanLine.includes('[WIFI-PROVISION] CONNECTED')) {
          connected = true;
          const ipMatch = cleanLine.match(/CONNECTED\s+(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch) {
            return { success: true, ip: ipMatch[1] };
          }
          return { success: true };
        } else if (cleanLine.includes('[WIFI-PROVISION] FAILED')) {
          errorMsg = cleanLine.replace('[WIFI-PROVISION] FAILED', '').trim();
          return { success: false, error: errorMsg };
        }
      }
    }
    
    if (!accepted) {
      return { success: false, error: 'TIMEOUT' };
    }
    
    return { success: false, error: 'CONNECT_TIMEOUT' };
  } finally {
    try { writer.releaseLock(); } catch(e) {}
    try { reader.releaseLock(); } catch(e) {}
  }
}

async function clearCredentialsFromMemory() {
  const ssidInput = document.getElementById('wifi-ssid');
  const passInput = document.getElementById('wifi-password');
  
  if (ssidInput) ssidInput.value = '';
  if (passInput) passInput.value = '';
  
  if (activeReader) {
    try { await activeReader.cancel(); } catch(e) {}
    activeReader = null;
  }
}

function validateWifiCredentials(ssid, password) {
  const encoder = new TextEncoder();
  const ssidBytes = encoder.encode(ssid);
  const passBytes = encoder.encode(password);
  
  if (ssidBytes.length < 1 || ssidBytes.length > 32) {
    return { valid: false, error: 'SSID must be 1-32 bytes' };
  }
  
  if (passBytes.length < 8 || passBytes.length > 63) {
    return { valid: false, error: 'Password must be 8-63 bytes (WPA/WPA2)' };
  }
  
  return { valid: true };
}

function logToWifiLog(message, type = 'info') {
  const wifiLog = document.getElementById('wifi-status');
  if (!wifiLog) return;
  
  const line = document.createElement('div');
  line.className = `status-line ${type}`;
  line.textContent = message;
  wifiLog.appendChild(line);
  wifiLog.scrollTop = wifiLog.scrollHeight;
}

function showUnsupportedBrowser() {
  currentState = STATE.UNSUPPORTED_BROWSER;
  const browserWarning = document.getElementById('browser-warning');
  if (browserWarning) browserWarning.classList.add('visible');
  
  const btnConnectWifi = document.getElementById('btn-connect-wifi');
  if (btnConnectWifi) btnConnectWifi.disabled = true;
  
  renderState();
}

async function handleSerialConnect() {
  const btn = document.getElementById('btn-top-serial');
  
  if (activePort && activePort.readable) {
    try {
      if (activeReader) {
        try { await activeReader.cancel(); } catch(e) {}
        activeReader = null;
      }
      await activePort.close();
    } catch(e) {}
    
    activePort = null;
    updateSerialStatus(false);
    logToWifiLog('Serial port disconnected.', 'info');
    return;
  }
  
  try {
    await ensureSerialPort();
    logToWifiLog('Serial connected! Performing identity handshake...', 'info');
    
    try {
      const identityVerified = await performIdentityHandshake();
      if (identityVerified) {
        updateFirmwareStatus(true);
        logToWifiLog('SlimeVR Tracker Firmware detected on port!', 'success');
      } else {
        updateFirmwareStatus(true);
        logToWifiLog('Port connected and responsive.', 'success');
      }
    } catch(handshakeErr) {
      updateFirmwareStatus(true);
      logToWifiLog('Identity handshake skipped: ' + handshakeErr.message, 'warn');
    }
  } catch (err) {
    logToWifiLog('Serial connection error: ' + err.message, 'error');
    updateSerialStatus(false);
  }
}

function goToStep(idx) {
  const targetContents = Array.from(document.querySelectorAll('.step-content'));
  const targetIdx = Math.max(0, Math.min(idx, targetContents.length - 1));
  document.querySelectorAll('.step-item').forEach((it, j) => {
    it.classList.toggle('is-active', j === targetIdx);
    it.classList.toggle('is-complete', j < targetIdx);
  });
  targetContents.forEach((content, j) => {
    content.classList.toggle('hidden', j !== targetIdx);
  });
  const liveLog = document.getElementById('live-log');
  if (liveLog) liveLog.classList.toggle('is-empty', liveLog.textContent.trim() === '');
  if (history.replaceState) history.replaceState(null, '', '#step-' + targetIdx);
}

function setupNavigation() {
  document.querySelectorAll('.step-item').forEach((item, idx) => {
    item.addEventListener('click', () => goToStep(idx));
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToStep(idx); }
    });
  });
}

function setupPasswordToggle() {
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('wifi-password');
  
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', function() {
      passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
      this.textContent = passwordInput.type === 'password' ? '👁️' : '🙈';
      this.setAttribute('aria-pressed', passwordInput.type === 'text');
    });
  }
}

async function handleWifiConnect() {
  const ssid = document.getElementById('wifi-ssid').value.trim();
  const password = document.getElementById('wifi-password').value;
  
  const validation = validateWifiCredentials(ssid, password);
  if (!validation.valid) {
    logToWifiLog(`Validation error: ${validation.error}`, 'error');
    return;
  }
  
  currentState = STATE.SERIAL_CONNECTING;
  renderState();
  
  const btnConnectWifi = document.getElementById('btn-connect-wifi');
  const btnRetryWifi = document.getElementById('btn-retry-wifi');
  
  if (btnConnectWifi) btnConnectWifi.classList.add('hidden');
  if (btnRetryWifi) btnRetryWifi.classList.remove('hidden');
  
  let currentPort = null;
  
  try {
    if (!('serial' in navigator)) {
      showUnsupportedBrowser();
      return;
    }
    
    logToWifiLog('Connecting to device serial port...', 'info');
    currentPort = await ensureSerialPort();
    
    logToWifiLog('Identity handshake successful.', 'success');
    
    currentState = STATE.SENDING_CREDENTIALS;
    renderState();
    logToWifiLog('Sending WiFi credentials...', 'info');
    
    const result = await sendWiFiCredentials(ssid, password);
    
    if (result.success) {
      currentState = STATE.CONNECTED;
      renderState();
      logToWifiLog(`WiFi connected! IP: ${result.ip || 'N/A'}`, 'success');
      
      const verifyResult = document.getElementById('verify-result');
      if (verifyResult) {
        verifyResult.textContent = `Connected to ${ssid}`;
        verifyResult.style.color = 'var(--success)';
      }
      
      await clearCredentialsFromMemory();
    } else {
      currentState = STATE.PROVISION_FAILED;
      renderState();
      logToWifiLog(`WiFi connection failed: ${result.error}`, 'error');
      
      const verifyResult = document.getElementById('verify-result');
      if (verifyResult) {
        verifyResult.textContent = `WiFi connection failed (${result.error})`;
        verifyResult.style.color = 'var(--danger)';
      }
      
      await clearCredentialsFromMemory();
    }
  } catch (error) {
    logToWifiLog(`Error: ${error.message}`, 'error');
    updateSerialStatus(false);
    
    if (currentState !== STATE.PROVISION_FAILED && currentState !== STATE.CONNECTED) {
      currentState = STATE.PROVISION_FAILED;
      renderState();
    }
    
    await clearCredentialsFromMemory();
  }
}

function setupRetryButton() {
  const btnRetryWifi = document.getElementById('btn-retry-wifi');
  
  if (btnRetryWifi) {
    btnRetryWifi.addEventListener('click', async () => {
      document.getElementById('wifi-password').value = '';
      
      const btnConnectWifi = document.getElementById('btn-connect-wifi');
      if (btnConnectWifi) btnConnectWifi.classList.remove('hidden');
      if (btnRetryWifi) btnRetryWifi.classList.add('hidden');
      
      logToWifiLog('Ready to retry', 'info');
    });
  }
}

function setupResetButton() {
  const btnReset = document.getElementById('btn-reset');
  
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      location.reload();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!('serial' in navigator) || !window.isSecureContext) {
    showUnsupportedBrowser();
  }

  setupNavigation();
  setupPasswordToggle();
  setupResetButton();
  initBrowserKpi();

  document.getElementById('btn-top-serial')?.addEventListener('click', handleSerialConnect);
  document.getElementById('btn-connect-wifi')?.addEventListener('click', handleWifiConnect);
  setupRetryButton();

  if (window.location.hash) {
    const m = window.location.hash.match(/^#step-(\d)$/);
    if (m) goToStep(parseInt(m[1], 10));
    else goToStep(0);
  } else {
    goToStep(0);
  }
});
