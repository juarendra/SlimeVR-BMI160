const STATE = {
<<<<<<< HEAD
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

const SerialProtocol = {
    CMD_PROVISION: 0x01,
    CMD_GET_IDENTITY: 0x02,
    CMD_ACK: 0x03,
    CMD_NACK: 0x04
};

const encoder = new TextEncoder();

const ProvisionState = {
    getInitialState() {
        return {
            current: STATE.READY_TO_FLASH,
            serialPort: null,
            serialReader: null,
            serialWriter: null,
            ssid: '',
            password: '',
            deviceIdentity: {
                chipId: null,
                macAddress: null,
                firmwareVersion: null
            }
        };
    }
};

const UI = {
    elements: {},
    states: {},
    
    init() {
        this.elements = {
            app: document.getElementById('app'),
            browserWarning: document.getElementById('browser-warning'),
            contentArea: document.getElementById('content-area'),
            installSection: document.getElementById('install-section'),
            provisionSection: document.getElementById('provision-section'),
            completeSection: document.getElementById('complete-section'),
            errorSection: document.getElementById('error-section'),
            flashBtn: document.getElementById('flash-btn'),
            provisionForm: document.getElementById('provision-form'),
            ssidInput: document.getElementById('ssid'),
            passwordInput: document.getElementById('password'),
            connectSerialBtn: document.getElementById('connect-serial-btn'),
            provisionBtn: document.getElementById('provision-btn'),
            firmwareStatus: document.getElementById('firmware-status'),
            serialStatus: document.getElementById('serial-status'),
            deviceIdentity: document.getElementById('device-identity'),
            chipId: document.getElementById('chip-id'),
            macAddress: document.getElementById('mac-address'),
            firmwareVersion: document.getElementById('firmware-version'),
            identityVerify: document.getElementById('identity-verify'),
            resetBtn: document.getElementById('reset-btn'),
            retryBtn: document.getElementById('retry-btn'),
            errorMessage: document.getElementById('error-message'),
            steps: document.querySelectorAll('.step')
        };

        this.states = ProvisionState.getInitialState();

        this.setupEventListeners();
        this.checkBrowserSupport();
        this.updateUI();
    },

    checkBrowserSupport() {
        if (!('serial' in navigator)) {
            this.transitionTo(STATE.UNSUPPORTED_BROWSER);
        }
    },

    setupEventListeners() {
        this.elements.provisionForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.elements.connectSerialBtn.addEventListener('click', () => this.handleConnectSerial());
        this.elements.resetBtn.addEventListener('click', () => this.handleReset());
        this.elements.retryBtn.addEventListener('click', () => this.handleRetry());
        
        this.elements.ssidInput.addEventListener('input', () => this.validateInputs());
        this.elements.passwordInput.addEventListener('input', () => this.validateInputs());
        this.elements.identityVerify.addEventListener('change', () => this.validateForm());
        
        this.elements.flashBtn.addEventListener('activate', () => this.handleFlashActivate());
        this.elements.flashBtn.addEventListener('error', () => this.handleFlashError());
    },

    handleFlashActivate() {
        this.transitionTo(STATE.FLASHING);
        this.updateStatus(this.elements.firmwareStatus, 'Flashing firmware...', 'info');
    },

    handleFlashError() {
        this.updateStatus(this.elements.firmwareStatus, 'Flash failed. Please try again.', 'error');
    },

    handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.states.current !== STATE.READY_TO_PROVISION) {
            return;
        }

        if (!this.states.deviceIdentity.chipId) {
            this.showIdentityPrompt();
            return;
        }

        if (!this.elements.identityVerify.checked) {
            this.updateStatus(this.elements.serialStatus, 'Please verify device identity first', 'warning');
            return;
        }

        this.transitionTo(STATE.SENDING_CREDENTIALS);
        this.sendCredentials();
    },

    async handleConnectSerial() {
        if (this.states.current !== STATE.READY_TO_PROVISION) {
            this.transitionTo(STATE.READY_TO_PROVISION);
        }

        if (!this.states.serialPort) {
            try {
                this.transitionTo(STATE.SERIAL_CONNECTING);
                this.updateStatus(this.elements.serialStatus, 'Connecting to device...', 'info');
                
                const filters = [
                    { vendorId: 0x1A86, productId: 0x55D4 },
                    { vendorId: 0x10C4, productId: 0xEA60 },
                    { vendorId: 0x0403, productId: 0x6001 }
                ];

                this.states.serialPort = await navigator.serial.requestPort({ filters });
                
                await this.states.serialPort.open({ baudRate: 115200 });
                
                this.states.serialReader = this.states.serialPort.readable.getReader();
                this.states.serialWriter = this.states.serialPort.writable.getWriter();
                
                this.transitionTo(STATE.CONNECTED);
                await this.fetchDeviceIdentity();
            } catch (error) {
                console.error('Serial connection error:', error);
                this.transitionTo(STATE.PROVISION_FAILED);
                this.elements.errorMessage.textContent = `Failed to connect: ${error.message}`;
                this.updateUI();
            }
        }
    },

    async fetchDeviceIdentity() {
        try {
            const command = new Uint8Array([SerialProtocol.CMD_GET_IDENTITY]);
            await this.states.serialWriter.write(command);
            
            const response = await this.readSerialResponse(5000);
            
            if (response && response[0] === SerialProtocol.CMD_ACK) {
                const data = new TextDecoder().decode(response.slice(1));
                const identity = JSON.parse(data);
                
                this.states.deviceIdentity = {
                    chipId: identity.chipId || 'Unknown',
                    macAddress: identity.macAddress || 'Unknown',
                    firmwareVersion: identity.firmwareVersion || 'Custom'
                };
                
                this.updateIdentityDisplay();
                this.transitionTo(STATE.READY_TO_PROVISION);
                this.updateStatus(this.elements.serialStatus, 'Device connected successfully', 'success');
            } else {
                this.transitionTo(STATE.PROVISION_FAILED);
                this.elements.errorMessage.textContent = 'Failed to retrieve device identity';
            }
        } catch (error) {
            console.error('Identity fetch error:', error);
            this.transitionTo(STATE.PROVISION_FAILED);
            this.elements.errorMessage.textContent = `Identity fetch failed: ${error.message}`;
        }
        
        this.updateUI();
    },

    async readSerialResponse(timeout = 5000) {
        const decoder = new TextDecoder();
        
        const startTime = Date.now();
        const responseBuffer = [];
        
        while (Date.now() - startTime < timeout) {
            const { value, done } = await this.states.serialReader.read();
            
            if (done) {
                break;
            }
            
            if (value) {
                responseBuffer.push(...value);
                
                if (responseBuffer.length >= 2 && responseBuffer[0] === SerialProtocol.CMD_ACK) {
                    return new Uint8Array(responseBuffer);
                }
                
                if (responseBuffer.length >= 2 && responseBuffer[0] === SerialProtocol.CMD_NACK) {
                    throw new Error('Device reported error');
                }
            }
        }
        
        return null;
    },

    async sendCredentials() {
        try {
            const credentials = {
                ssid: this.states.ssid,
                password: this.states.password
            };
            
            const data = encoder.encode(JSON.stringify(credentials));
            const packet = new Uint8Array([SerialProtocol.CMD_PROVISION, ...data]);
            
            await this.states.serialWriter.write(packet);
            
            this.transitionTo(STATE.WAITING_FOR_WIFI);
            this.updateStatus(this.elements.serialStatus, 'Sending credentials to device...', 'info');
            
            const response = await this.readSerialResponse(10000);
            
            if (response && response[0] === SerialProtocol.CMD_ACK) {
                this.transitionTo(STATE.FLASH_COMPLETE);
                this.updateStatus(this.elements.serialStatus, 'WiFi credentials sent successfully', 'success');
            } else {
                throw new Error('Device did not acknowledge credentials');
            }
        } catch (error) {
            console.error('Send credentials error:', error);
            this.transitionTo(STATE.PROVISION_FAILED);
            this.elements.errorMessage.textContent = `Failed to send credentials: ${error.message}`;
            this.updateUI();
        }
    },

    handleReset() {
        this.states = ProvisionState.getInitialState();
        this.transitionTo(STATE.READY_TO_FLASH);
        this.updateUI();
    },

    handleRetry() {
        this.transitionTo(STATE.READY_TO_PROVISION);
        this.updateUI();
    },

    validateInputs() {
        this.states.ssid = this.elements.ssidInput.value.trim();
        this.states.password = this.elements.passwordInput.value;
        
        let valid = true;
        
        if (this.states.ssid.length < 1 || this.states.ssid.length > 32) {
            this.elements.ssidInput.setCustomValidity('SSID must be 1-32 characters');
            valid = false;
        } else {
            this.elements.ssidInput.setCustomValidity('');
        }
        
        if (this.states.password.length < 8 || this.states.password.length > 63) {
            this.elements.passwordInput.setCustomValidity('Password must be 8-63 characters');
            valid = false;
        } else {
            this.elements.passwordInput.setCustomValidity('');
        }
        
        this.validateForm();
        
        return valid;
    },

    validateForm() {
        const ssidValid = this.states.ssid.length >= 1 && this.states.ssid.length <= 32;
        const passwordValid = this.states.password.length >= 8 && this.states.password.length <= 63;
        const identityVerified = this.elements.identityVerify.checked;
        
        this.elements.provisionBtn.disabled = !(ssidValid && passwordValid && identityVerified && this.states.deviceIdentity.chipId);
    },

    showIdentityPrompt() {
        this.updateStatus(this.elements.serialStatus, 'Connect to device first to verify identity', 'warning');
    },

    updateIdentityDisplay() {
        this.elements.chipId.textContent = this.states.deviceIdentity.chipId;
        this.elements.macAddress.textContent = this.states.deviceIdentity.macAddress;
        this.elements.firmwareVersion.textContent = this.states.deviceIdentity.firmwareVersion;
        
        this.elements.deviceIdentity.classList.remove('hidden');
    },

    updateStatus(element, message, type) {
        if (!element) return;
        
        if (!message) {
            element.classList.add('hidden');
            return;
        }
        
        element.className = `status-msg ${type}`;
        element.innerHTML = `<span class="status-icon">${type === 'error' ? '✗' : type === 'success' ? '✓' : 'ℹ'}</span><span class="status-text">${message}</span>`;
        element.classList.remove('hidden');
    },

    updateUI() {
        const { current } = this.states;
        
        this.elements.installSection.classList.add('hidden');
        this.elements.provisionSection.classList.add('hidden');
        this.elements.completeSection.classList.add('hidden');
        this.elements.errorSection.classList.add('hidden');
        
        this.elements.connectSerialBtn.classList.remove('hidden');
        this.elements.provisionBtn.classList.add('hidden');
        this.elements.firmwareStatus.classList.add('hidden');
        this.elements.serialStatus.classList.add('hidden');
        this.elements.deviceIdentity.classList.add('hidden');
        this.elements.identityVerify.checked = false;
        
        this.elements.resetBtn.classList.remove('hidden');
        this.elements.retryBtn.classList.add('hidden');
        
        this.elements.flashBtn.disabled = false;
        
        switch (current) {
            case STATE.UNSUPPORTED_BROWSER:
                this.elements.browserWarning.classList.remove('hidden');
                this.elements.contentArea.classList.add('hidden');
                break;
                
            case STATE.READY_TO_FLASH:
                this.elements.installSection.classList.remove('hidden');
                break;
                
            case STATE.FLASHING:
                this.elements.installSection.classList.remove('hidden');
                this.elements.flashBtn.disabled = true;
                break;
                
            case STATE.FLASH_COMPLETE:
                this.elements.installSection.classList.add('hidden');
                this.elements.completeSection.classList.remove('hidden');
                this.updateSteps(3);
                break;
                
            case STATE.READY_TO_PROVISION:
                this.elements.installSection.classList.add('hidden');
                this.elements.provisionSection.classList.remove('hidden');
                this.updateSteps(2);
                
                if (this.states.deviceIdentity.chipId) {
                    this.elements.connectSerialBtn.classList.add('hidden');
                    this.elements.provisionBtn.classList.remove('hidden');
                }
                
                this.validateForm();
                break;
                
            case STATE.SERIAL_CONNECTING:
                this.elements.installSection.classList.add('hidden');
                this.elements.provisionSection.classList.remove('hidden');
                this.updateSteps(2);
                this.elements.connectSerialBtn.disabled = true;
                break;
                
            case STATE.SENDING_CREDENTIALS:
                this.elements.installSection.classList.add('hidden');
                this.elements.provisionSection.classList.remove('hidden');
                this.updateSteps(2);
                this.elements.connectSerialBtn.disabled = true;
                this.elements.provisionBtn.disabled = true;
                break;
                
            case STATE.WAITING_FOR_WIFI:
                this.elements.installSection.classList.add('hidden');
                this.elements.provisionSection.classList.remove('hidden');
                this.updateSteps(2);
                this.elements.connectSerialBtn.disabled = true;
                this.elements.provisionBtn.disabled = true;
                break;
                
            case STATE.CONNECTED:
                this.elements.installSection.classList.add('hidden');
                this.elements.provisionSection.classList.remove('hidden');
                this.updateSteps(2);
                this.elements.connectSerialBtn.classList.add('hidden');
                this.elements.provisionBtn.classList.remove('hidden');
                this.validateForm();
                break;
                
            case STATE.PROVISION_FAILED:
                this.elements.installSection.classList.add('hidden');
                this.elements.errorSection.classList.remove('hidden');
                this.elements.retryBtn.classList.remove('hidden');
                this.elements.resetBtn.classList.add('hidden');
                this.updateSteps(2);
                break;
                
            case STATE.DEVICE_DISCONNECTED:
                this.elements.installSection.classList.add('hidden');
                this.elements.provisionSection.classList.remove('hidden');
                this.updateSteps(2);
                this.elements.connectSerialBtn.classList.remove('hidden');
                this.elements.provisionBtn.classList.add('hidden');
                this.updateStatus(this.elements.serialStatus, 'Device disconnected', 'warning');
                break;
        }
    },

    updateSteps(completedStep) {
        this.elements.steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            
            if (index < completedStep) {
                step.classList.add('completed');
            } else if (index === completedStep - 1) {
                step.classList.add('active');
            }
        });
    },

    transitionTo(newState) {
        this.states.current = newState;
        this.updateUI();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
=======
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
  const items = document.querySelectorAll('.step-item');
  const contents = document.querySelectorAll('.step-content');
  let targetStep = 1;
  
  switch (currentState) {
    case STATE.UNSUPPORTED_BROWSER:
      targetStep = 0;
      break;
    case STATE.READY_TO_FLASH:
    case STATE.FLASHING:
    case STATE.FLASH_COMPLETE:
      targetStep = 1;
      break;
    case STATE.READY_TO_PROVISION:
    case STATE.SERIAL_CONNECTING:
    case STATE.SENDING_CREDENTIALS:
    case STATE.WAITING_FOR_WIFI:
    case STATE.PROVISION_FAILED:
    case STATE.DEVICE_DISCONNECTED:
      targetStep = 2;
      break;
    case STATE.CONNECTED:
      targetStep = 3;
      break;
  }
  
  items.forEach((item, idx) => {
    item.classList.toggle('active', idx === targetStep);
  });
  contents.forEach((content, idx) => {
    content.classList.toggle('hidden', idx !== targetStep);
  });
}

function updateSerialStatus(connected, portInfo = '') {
  const btn = document.getElementById('btn-top-serial');
  const led = document.getElementById('top-serial-led');
  const text = document.getElementById('top-serial-text');
  
  if (connected) {
    btn?.classList.add('connected');
    if (led) led.style.background = 'var(--success)';
    if (text) text.textContent = portInfo ? `Serial: Connected (${portInfo})` : 'Serial: Connected';
  } else {
    btn?.classList.remove('connected');
    if (led) led.style.background = 'var(--danger)';
    if (text) text.textContent = 'Connect Serial (Disconnected)';
  }
}

function updateFirmwareStatus(flashed) {
  const dot = document.getElementById('top-firmware-dot');
  const text = document.getElementById('top-firmware-text');
  
  if (flashed) {
    if (dot) dot.style.background = 'var(--success)';
    if (text) {
      text.textContent = 'Flashed (Ready)';
      text.style.color = 'var(--success)';
    }
  } else {
    if (dot) dot.style.background = 'var(--warning)';
    if (text) {
      text.textContent = 'Not Verified';
      text.style.color = 'var(--warning)';
    }
  }
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

function setupNavigation() {
  document.querySelectorAll('.step-item').forEach((item) => {
    item.addEventListener('click', () => {
      const step = parseInt(item.getAttribute('data-step'), 10);
      const items = document.querySelectorAll('.step-item');
      const contents = document.querySelectorAll('.step-content');
      
      items.forEach((item, idx) => {
        item.classList.toggle('active', idx === step);
      });
      contents.forEach((content, idx) => {
        content.classList.toggle('hidden', idx !== step);
      });
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
  
  document.getElementById('btn-top-serial')?.addEventListener('click', handleSerialConnect);
  document.getElementById('btn-connect-wifi')?.addEventListener('click', handleWifiConnect);
  setupRetryButton();
  
  renderState();
>>>>>>> origin/main
});
