/**
 * Start.js - Configuration Setup for Cache Simulation
 * Handles reference string, frame size input, and algorithm selection
 */

class StartConfig {
  constructor() {
    this.config = {
      referenceString: '',
      frameSize: '',
      selectedAlgorithms: [],
    };
    this.init();
  }

  /**
   * Initialize the configuration app
   */
  init() {
    this.setupEventListeners();
    this.loadStoredConfig();
  }

  /**
   * Show or clear an error message in a target element
   * Pass empty string to clear
   */
  showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!message) {
      el.classList.remove('error-visible');
      el.textContent = '';
      return;
    }
    el.textContent = message;
    el.classList.add('error-visible');
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Reference string input validation
    const referenceInput = document.getElementById('referenceString');
    if (referenceInput) {
      referenceInput.addEventListener('input', (e) => this.validateReferenceString(e));
    }

    // Frame size input validation
    const frameSizeInput = document.getElementById('frameSize');
    if (frameSizeInput) {
      frameSizeInput.addEventListener('input', (e) => this.validateFrameSize(e));
      frameSizeInput.addEventListener('change', (e) => this.validateFrameSize(e));
    }

    // Randomize button
    const randomizeBtn = document.getElementById('randomizeBtn');
    if (randomizeBtn) {
      randomizeBtn.addEventListener('click', () => this.randomizeReference());
    }

    // Upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.triggerFileUpload());
    }

    // Clear input button
    const clearBtn = document.getElementById('clearInputBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllInput());
    }

    // Algorithm items — use data-algo attribute for robustness
    const algoItems = document.querySelectorAll('.algo-item');
    algoItems.forEach((item) => {
      item.addEventListener('click', () => this.toggleAlgorithm(item));
    });

    // File input (hidden)
    const fileInput = document.getElementById('fileUpload');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // Simulate button
    const simulateBtn = document.getElementById('simulateBtn');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => this.proceedToSimulation());
    }
  }

  /**
   * Validate reference string (10–40 space-separated tokens)
   * Counts tokens, not raw character length
   */
  validateReferenceString(event) {
    const input = event.target;
    const value = input.value.trim();

    const tokens = value.length > 0 ? value.split(/\s+/) : [];

    if (value.length > 0 && tokens.length < 10) {
      this.showError('referenceError', 'Reference string must have at least 10 page references');
      input.classList.add('input-error');
      return false;
    } else if (tokens.length > 40) {
      this.showError('referenceError', 'Reference string must not exceed 40 page references');
      input.classList.add('input-error');
      return false;
    } else {
      this.showError('referenceError', '');
      input.classList.remove('input-error');
      this.config.referenceString = value;
      this.saveConfig();
      return true;
    }
  }

  /**
   * Validate frame size (3–10)
   */
  validateFrameSize(event) {
    const input = event.target;
    const value = parseInt(input.value);

    // Empty field — silently clear error, do not block or show message
    if (input.value.trim() === '') {
      this.showError('frameSizeError', '');
      input.classList.remove('input-error');
      return false;
    }

    if (isNaN(value)) {
      this.showError('frameSizeError', 'Please enter a valid number');
      input.classList.add('input-error');
      return false;
    }
 
    if (value < 3 || value > 10) {
      this.showError('frameSizeError', 'Frame size must be between 3 and 10');
      input.classList.add('input-error');
      return false;
    } else {
      this.showError('frameSizeError', '');
      input.classList.remove('input-error');
      this.config.frameSize = value;
      this.saveConfig();
      return true;
    }
  }

  /**
   * Randomize reference string and frame size
   * Reference: 10–40 space-separated page numbers (0–9)
   * Frame size: random integer between 3 and 10
   */
  randomizeReference() {
    const count = Math.floor(Math.random() * 31) + 10;
    const tokens = [];
    for (let i = 0; i < count; i++) {
      tokens.push(Math.floor(Math.random() * 10));
    }
    const randomString = tokens.join(' ');

    const referenceInput = document.getElementById('referenceString');
    if (referenceInput) {
      referenceInput.value = randomString;
      referenceInput.dispatchEvent(new Event('input'));
    }

    const randomFrameSize = Math.floor(Math.random() * 8) + 3;
    const frameSizeInput = document.getElementById('frameSize');
    if (frameSizeInput) {
      frameSizeInput.value = randomFrameSize;
      frameSizeInput.dispatchEvent(new Event('input'));
    }
  }

  /**
   * Trigger file upload dialog
   */
  triggerFileUpload() {
    const fileInput = document.getElementById('fileUpload');
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Handle file upload
   * Expected file format (two lines):
   *   Line 1 — frames:<number>        e.g. frames:5
   *   Line 2 — reference string       e.g. 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1
   */
  handleFileUpload(event) {
    const file = event.target.files[0];
    console.log('file:', file);
    console.log('file.type:', file?.type);
    console.log('file.name:', file?.name);
    if (!file) return;

    // After
    if (!file.name.endsWith('.txt') && !file.type.includes('text')) {
        this.showError('referenceError', 'Please upload a .txt file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('raw file content:', e.target.result);
      try {
        const lines = e.target.result.trim().split(/\r?\n/);

        if (lines.length < 2) {
          this.showError('referenceError', 'Invalid format. Line 1: frames:<number>  Line 2: reference string');
          return;
        }

        const frameLine = lines[0].trim();
        const frameMatch = frameLine.match(/^frames:(\d+)$/i);
        if (!frameMatch) {
          this.showError('frameSizeError', 'Invalid format. First line must be "frames:<number>" e.g. frames:5');
          return;
        }

        const frameSize = parseInt(frameMatch[1]);
        if (frameSize < 3 || frameSize > 10) {
          this.showError('frameSizeError', 'Frame size in file must be between 3 and 10');
          return;
        }

        const refString = lines[1].trim();
        const tokens = refString.split(/\s+/);
        if (tokens.length < 10 || tokens.length > 40) {
          this.showError('referenceError', 'Reference string must have between 10 and 40 page references');
          return;
        }

        // All valid — clear any existing errors and apply values
        this.showError('referenceError', '');
        this.showError('frameSizeError', '');

        const frameSizeInput = document.getElementById('frameSize');
        if (frameSizeInput) {
          frameSizeInput.value = frameSize;
          frameSizeInput.dispatchEvent(new Event('input'));
        }

        const referenceInput = document.getElementById('referenceString');
        if (referenceInput) {
          referenceInput.value = refString;
          referenceInput.dispatchEvent(new Event('input'));
        }

      } catch (error) {
        this.showError('referenceError', 'Error reading file: ' + error.message);
      }
    };

    reader.readAsText(file);

    // Add as the very last line of handleFileUpload, after reader.readAsText(file)
    event.target.value = '';
  }

  /**
   * Clear all input fields
   */
  clearAllInput() {
    const referenceInput = document.getElementById('referenceString');
    const frameSizeInput = document.getElementById('frameSize');

    if (referenceInput) referenceInput.value = '';
    if (frameSizeInput) frameSizeInput.value = '';

    this.showError('referenceError', '');
    this.showError('frameSizeError', '');
    this.showError('generalError', '');

    this.config.referenceString = '';
    this.config.frameSize = '';
    this.saveConfig();
  }

  /**
   * Toggle algorithm selection
   * Reads from data-algo attribute to avoid capturing nested element text
   */
  toggleAlgorithm(element) {
    const algoName = element.dataset.algo || element.textContent.trim();
    element.classList.toggle('selected');

    if (element.classList.contains('selected')) {
      if (!this.config.selectedAlgorithms.includes(algoName)) {
        this.config.selectedAlgorithms.push(algoName);
      }
    } else {
      this.config.selectedAlgorithms = this.config.selectedAlgorithms.filter((a) => a !== algoName);
    }

    // Clear algo error as soon as one is selected
    if (this.config.selectedAlgorithms.length > 0) {
      this.showError('generalError', '');
    }

    this.saveConfig();
  }

  /**
   * Validate all fields and proceed to simulation
   * Reads frame size directly from DOM to catch values not yet synced to config
   */
  proceedToSimulation() {
    const referenceVal = this.config.referenceString;

    const frameSizeInput = document.getElementById('frameSize');
    const frameSizeVal = frameSizeInput ? parseInt(frameSizeInput.value) : NaN;

    const algosSelected = this.config.selectedAlgorithms.length > 0;

    const tokens = referenceVal ? referenceVal.split(/\s+/) : [];
    if (!referenceVal || tokens.length < 10 || tokens.length > 40) {
      this.showError('referenceError', 'Please enter a valid reference string (10–40 page references)');
      return;
    }

    if (isNaN(frameSizeVal) || frameSizeVal < 3 || frameSizeVal > 10) {
      this.showError('frameSizeError', 'Frame size must be between 3 and 10');
      return;
    }

    if (!algosSelected) {
      this.showError('generalError', 'Please select at least one algorithm');
      return;
    }

    this.config.frameSize = frameSizeVal;
    this.saveConfig();
    window.location.href = 'simulate.html';
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig() {
    localStorage.setItem('cacheSimulationConfig', JSON.stringify(this.config));
  }

  /**
   * Load configuration from localStorage
   */
  loadStoredConfig() {
    try {
      const stored = localStorage.getItem('cacheSimulationConfig');
      if (stored) {
        this.config = JSON.parse(stored);

        const referenceInput = document.getElementById('referenceString');
        const frameSizeInput = document.getElementById('frameSize');

        if (referenceInput) referenceInput.value = this.config.referenceString || '';
        if (frameSizeInput) frameSizeInput.value = this.config.frameSize || '';

        if (this.config.selectedAlgorithms.length > 0) {
          const algoItems = document.querySelectorAll('.algo-item');
          algoItems.forEach((item) => {
            const algoName = item.dataset.algo || item.textContent.trim();
            if (this.config.selectedAlgorithms.includes(algoName)) {
              item.classList.add('selected');
            } else {
              item.classList.remove('selected');
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading stored config:', error);
    }
  }
}

// Initialize when DOM is ready
let startConfig;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startConfig = new StartConfig();
  });
} else {
  startConfig = new StartConfig();
}