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
});
