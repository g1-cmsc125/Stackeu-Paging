class CacheSimulator {
  constructor() {
    this.config = null;
    this.referenceString = [];
    this.frameSize = 0;
    this.results = {}; 

    this.init();
  }

  init() {
    this.loadConfig();
    if (!this.config) return;

    setTimeout(async () => {
      this.runAllSelected();
      await this.renderUI(); 
      this.setupGlobalControls();
    }, 50); 
  }

  loadConfig() {
    try {
      let stored = null;
      if (window.javaApp) {
          try { stored = window.javaApp.getConfig(); } catch(e) {}
      } 
      if (!stored || stored === "") {
          stored = sessionStorage.getItem('cacheSimulationConfig') || localStorage.getItem('cacheSimulationConfig');
      }

      if (stored && stored !== "") {
        this.config = JSON.parse(stored);
        this.referenceString = this.config.referenceString.split(/\s+/).map(Number);
        this.frameSize = this.config.frameSize;
      } else {
        if (window.javaApp) window.javaApp.navigate('start');
        else window.location.href = '../index.html'; 
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  runAllSelected() {
    this.config.selectedAlgorithms.forEach(algoFullName => {
      // FIX: Resilient matching ensures FIFO (and all others) always run perfectly
      const key = algoFullName.toUpperCase();
      
      if (key.includes('FIFO')) this.results[algoFullName] = this.simulateFIFO();
      else if (key.includes('LRU')) this.results[algoFullName] = this.simulateLRU();
      else if (key.includes('LFU')) this.results[algoFullName] = this.simulateLFU();
      else if (key.includes('OPT')) this.results[algoFullName] = this.simulateOPT();
      else if (key.includes('MFU')) this.results[algoFullName] = this.simulateMFU();
      else if (key.includes('ENHANCED')) this.results[algoFullName] = this.simulateEnhancedSecondChance();
      else if (key.includes('SECOND CHANCE')) this.results[algoFullName] = this.simulateSecondChance();
      else console.warn(`Algorithm logic not found for: ${algoFullName}`);
    });
  }

  createStepRecord(page, isHit, frames) { return { page, isHit, frames: [...frames] }; }

  // --- ALGORITHMS ---
  simulateFIFO() {
    let frames = [], history = [], hits = 0, faults = 0;
    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      if (isHit) hits++;
      else {
        faults++;
        if (frames.length < this.frameSize) frames.push(page);
        else { frames.shift(); frames.push(page); }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateLRU() {
    let frames = [], history = [], hits = 0, faults = 0;
    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      if (isHit) {
        hits++;
        frames = frames.filter(p => p !== page);
        frames.push(page);
      } else {
        faults++;
        if (frames.length < this.frameSize) frames.push(page);
        else { frames.shift(); frames.push(page); }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateLFU() {
    let frames = [], history = [], hits = 0, faults = 0;
    let frequencies = new Map(), arrivalTimes = new Map(), time = 0;

    for (let page of this.referenceString) {
      time++;
      let isHit = frames.includes(page);
      if (isHit) {
        hits++;
        frequencies.set(page, frequencies.get(page) + 1);
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page); frequencies.set(page, 1); arrivalTimes.set(page, time);
        } else {
          let minFreq = Infinity, oldestTime = Infinity, lfuPage = -1;
          for (let p of frames) {
            let freq = frequencies.get(p), arrTime = arrivalTimes.get(p);
            if (freq < minFreq || (freq === minFreq && arrTime < oldestTime)) {
              minFreq = freq; oldestTime = arrTime; lfuPage = p;
            }
          }
          frames = frames.filter(p => p !== lfuPage);
          frequencies.delete(lfuPage); arrivalTimes.delete(lfuPage);
          frames.push(page); frequencies.set(page, 1); arrivalTimes.set(page, time);
        }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateOPT() {
    let frames = [], history = [], hits = 0, faults = 0;
    for (let i = 0; i < this.referenceString.length; i++) {
      let page = this.referenceString[i];
      let isHit = frames.includes(page);
      if (isHit) hits++;
      else {
        faults++;
        if (frames.length < this.frameSize) frames.push(page);
        else {
          let furthestUse = -1, optVictimIndex = -1;
          for (let j = 0; j < frames.length; j++) {
            let nextUse = this.referenceString.indexOf(frames[j], i + 1);
            if (nextUse === -1) { optVictimIndex = j; break; }
            if (nextUse > furthestUse) { furthestUse = nextUse; optVictimIndex = j; }
          }
          frames.splice(optVictimIndex, 1, page); 
        }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateMFU() {
    let frames = [], history = [], hits = 0, faults = 0;
    let frequencies = new Map(), arrivalTimes = new Map(), time = 0;

    for (let page of this.referenceString) {
      time++;
      let isHit = frames.includes(page);
      if (isHit) {
        hits++;
        frequencies.set(page, frequencies.get(page) + 1);
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page); frequencies.set(page, 1); arrivalTimes.set(page, time);
        } else {
          let maxFreq = -1, oldestTime = Infinity, mfuPage = -1;
          for (let p of frames) {
            let freq = frequencies.get(p), arrTime = arrivalTimes.get(p);
            if (freq > maxFreq || (freq === maxFreq && arrTime < oldestTime)) {
              maxFreq = freq; oldestTime = arrTime; mfuPage = p;
            }
          }
          frames = frames.filter(p => p !== mfuPage);
          frequencies.delete(mfuPage); arrivalTimes.delete(mfuPage);
          frames.push(page); frequencies.set(page, 1); arrivalTimes.set(page, time);
        }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateSecondChance() {
    let frames = [], history = [], hits = 0, faults = 0;
    let refBits = [], pointer = 0;  

    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      if (isHit) {
        hits++;
        let index = frames.indexOf(page);
        refBits[index] = 1; 
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page); refBits.push(1); 
        } else {
          while (true) {
            if (refBits[pointer] === 1) {
              refBits[pointer] = 0; 
              pointer = (pointer + 1) % this.frameSize; 
            } else {
              frames[pointer] = page; refBits[pointer] = 1; 
              pointer = (pointer + 1) % this.frameSize; 
              break;
            }
          }
        }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateEnhancedSecondChance() {
    let frames = [], history = [], hits = 0, faults = 0;
    let refBits = [], modBits = [], pointer = 0;

    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      let isModified = (page % 2 === 0) ? 1 : 0; 

      if (isHit) {
        hits++;
        let index = frames.indexOf(page);
        refBits[index] = 1; 
        if (isModified) modBits[index] = 1; 
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page); refBits.push(1); modBits.push(isModified);
        } else {
          let replaced = false;
          while (!replaced) {
            for (let i = 0; i < this.frameSize; i++) {
              let p = (pointer + i) % this.frameSize;
              if (refBits[p] === 0 && modBits[p] === 0) {
                frames[p] = page; refBits[p] = 1; modBits[p] = isModified;
                pointer = (p + 1) % this.frameSize; replaced = true; break;
              }
            }
            if (replaced) break;

            for (let i = 0; i < this.frameSize; i++) {
              let p = (pointer + i) % this.frameSize;
              if (refBits[p] === 0 && modBits[p] === 1) {
                frames[p] = page; refBits[p] = 1; modBits[p] = isModified;
                pointer = (p + 1) % this.frameSize; replaced = true; break;
              }
              refBits[p] = 0; 
            }
            if (replaced) break;
          }
        }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  scrollToActiveElement(containerElement, targetElement) {
    if (containerElement && targetElement) {
        const containerCenter = containerElement.clientWidth / 2;
        const activeCellCenter = targetElement.offsetLeft + (targetElement.clientWidth / 2);
        containerElement.scrollTo({ left: activeCellCenter - containerCenter, behavior: 'auto' });
    }
  }

  async renderUI() {
    const refStringHeader = document.querySelector('.reference-string');
    if (refStringHeader) refStringHeader.textContent = this.referenceString.join(', ');

    const mainWrapper = document.querySelector('.simulate-page');
    document.querySelectorAll('.simulation-card').forEach(card => card.remove());

    const actionButtons = document.querySelector('.action-buttons');
    const cols = this.referenceString.length;

    for (const [algoName, data] of Object.entries(this.results)) {
      await new Promise(resolve => setTimeout(resolve, 15)); 

      const card = document.createElement('div');
      card.className = 'simulation-card';

      let gridHtml = `<div class="sim-grid" style="display: grid; grid-template-columns: repeat(${cols}, minmax(64px, 1fr));">`;
      data.history.forEach((step, idx) => {
        gridHtml += `<div class="num-cell step-hidden" data-col="${idx}">${step.page}</div>`;
      });

      for (let f = 0; f < this.frameSize; f++) {
        data.history.forEach((step, idx) => {
          let val = step.frames[f];
          let isManipulated = step.frames[f] === step.page ? 'target-frame' : '';
          let colorClass = (isManipulated && val !== undefined) ? (step.isHit ? 'frame-hit' : 'frame-miss') : '';

          if (val !== undefined) {
            gridHtml += `<div class="frame filled step-hidden ${isManipulated} ${colorClass}" data-col="${idx}">${val}</div>`;
          } else {
            gridHtml += `<div class="frame empty step-hidden" data-col="${idx}"></div>`;
          }
        });
      }
      gridHtml += `</div>`;

      let legendHtml = `<div class="legend-row" style="display: grid; grid-template-columns: repeat(${cols}, minmax(64px, 1fr)); gap: 6px;">`;
      data.history.forEach((step, idx) => {
        let hitMissClass = step.isHit ? 'hit' : 'miss';
        let hitMissText = step.isHit ? 'Hit' : 'Miss';
        legendHtml += `<span class="${hitMissClass} step-hidden" data-col="${idx}">${hitMissText}</span>`;
      });
      legendHtml += `</div>`;

      card.innerHTML = `
        <div class="sim-header">
            <div class="algo-info">
                <h2 class="algo-name">${algoName}</h2>
            </div>
            <div class="controls">
                <div class="sim-timer">⏱ <span class="time-sec">0.000</span>s</div>
                <button class="btn-ctrl speed-toggle" title="Change Speed"><span>1x</span></button>
                <button class="btn-ctrl pause"><span>▶</span></button>
                <button class="btn-ctrl reset"><span>↺</span></button>
                <button class="btn-ctrl skip"><span>▶▶</span></button>
            </div>
        </div>
        <div class="sim-grid-container">
            ${gridHtml}
            ${legendHtml}
        </div>
        <footer class="sim-footer step-hidden" data-col="${cols - 1}">
            <p class="stat-summary">Total page faults: ${data.faults} | Total hits: ${data.hits}</p>
        </footer>
      `;

      mainWrapper.insertBefore(card, actionButtons);
      this.setupAnimator(card, cols);
    }
  }

  setupAnimator(card, totalSteps) {
    let currentStep = -1, isPlaying = false, intervalId = null, msTimerId = null;
    let speedMs = 1000, timeElapsed = 0.0, lastTime = 0;

    const btnPause = card.querySelector('.pause'), btnReset = card.querySelector('.reset');
    const btnSkip = card.querySelector('.skip'), btnSpeed = card.querySelector('.speed-toggle');
    const timeDisplay = card.querySelector('.time-sec'), scrollContainer = card.querySelector('.sim-grid-container');

    const clearHighlights = () => {
      card.querySelectorAll('.active-ref, .active-frame').forEach(el => el.classList.remove('active-ref', 'active-frame'));
    };

    const showStep = (stepIndex) => {
      if (stepIndex >= totalSteps) { pauseAnim(); btnPause.innerHTML = '<span>↺</span>'; return; }
      clearHighlights();
      const elements = card.querySelectorAll(`[data-col="${stepIndex}"]`);
      elements.forEach(el => {
        el.classList.remove('step-hidden'); el.classList.add('step-visible');
        if (el.classList.contains('num-cell')) el.classList.add('active-ref');
        if (el.classList.contains('target-frame')) el.classList.add('active-frame');
      });
      if (elements.length > 0) this.scrollToActiveElement(scrollContainer, elements[0]);
    };

    const playAnim = () => {
      if (currentStep >= totalSteps - 1) resetAnim(); 
      isPlaying = true; btnPause.innerHTML = '<span>❚❚</span>';
      
      lastTime = performance.now();
      msTimerId = setInterval(() => {
          const now = performance.now();
          timeElapsed += (now - lastTime) / 1000;
          lastTime = now;
          timeDisplay.textContent = timeElapsed.toFixed(3); 
      }, 16); 
      intervalId = setInterval(() => { currentStep++; showStep(currentStep); }, speedMs);
    };

    const pauseAnim = () => {
      isPlaying = false; btnPause.innerHTML = '<span>▶</span>';
      clearInterval(intervalId); clearInterval(msTimerId);
    };

    const resetAnim = () => {
      pauseAnim(); currentStep = -1; timeElapsed = 0.0; timeDisplay.textContent = '0.000';
      clearHighlights();
      card.querySelectorAll('.step-visible').forEach(el => { el.classList.remove('step-visible'); el.classList.add('step-hidden'); });
      scrollContainer.scrollTo({ left: 0, behavior: 'smooth' }); 
    };

    const skipToEnd = () => {
      pauseAnim(); clearHighlights();
      timeElapsed += ((totalSteps - Math.max(0, currentStep)) * (speedMs / 1000));
      timeDisplay.textContent = timeElapsed.toFixed(3);
      card.querySelectorAll('.step-hidden').forEach(el => { el.classList.remove('step-hidden'); el.classList.add('step-visible'); });
      currentStep = totalSteps; btnPause.innerHTML = '<span>↺</span>';
      scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
    };

    btnPause.addEventListener('click', () => isPlaying ? pauseAnim() : playAnim());
    btnReset.addEventListener('click', resetAnim);
    btnSkip.addEventListener('click', skipToEnd);
    
    btnSpeed.addEventListener('click', () => {
        if (speedMs === 1000) { speedMs = 500; btnSpeed.innerHTML = '<span>2x</span>'; }
        else if (speedMs === 500) { speedMs = 250; btnSpeed.innerHTML = '<span>4x</span>'; }
        else { speedMs = 1000; btnSpeed.innerHTML = '<span>1x</span>'; }
        if (isPlaying) { pauseAnim(); playAnim(); } 
    });

    setTimeout(playAnim, 200); 
  }

  setupGlobalControls() {
    const clearSessionAndNavigate = (viewName, fallbackPath) => {
        sessionStorage.removeItem('cacheSimulationConfig'); localStorage.removeItem('cacheSimulationConfig');
        if (window.javaApp) { try { window.javaApp.saveConfig(""); } catch (e) {} window.javaApp.navigate(viewName); } 
        else window.location.href = fallbackPath;
    };
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', (e) => { e.preventDefault(); clearSessionAndNavigate('start', 'start.html'); });
    const mainMenuBtn = document.getElementById('mainMenuBtn');
    if (mainMenuBtn) mainMenuBtn.addEventListener('click', (e) => { e.preventDefault(); clearSessionAndNavigate('home', '../index.html'); });
  }
} 

// ==========================================
// DELEGATED EXPORT LOGIC
// ==========================================
window.showLoading = (text) => {
    const title = document.getElementById('loadingTitle');
    const overlay = document.getElementById('exportLoadingOverlay');
    if (title) title.innerText = text;
    if (overlay) overlay.classList.remove('hidden');
};

window.hideLoading = () => {
    const overlay = document.getElementById('exportLoadingOverlay');
    if (overlay) overlay.classList.add('hidden');
};

// Listen for the iframe completing the export
window.addEventListener('message', (event) => {
    if(event.data.type === 'EXPORT_READY') {
        window.hideLoading();
        if(event.data.format === 'img') {
            if(window.javaApp) window.javaApp.saveImage(event.data.base64);
            else {
                const link = document.createElement('a');
                link.download = "Simulation.png"; link.href = event.data.base64; link.click();
            }
        } else {
            if(window.javaApp) window.javaApp.savePdf(event.data.base64);
            else {
                const link = document.createElement('a');
                link.download = "Simulation.pdf"; link.href = event.data.base64; link.click();
            }
        }
    }
});

function triggerIframeExport(format) {
    const iframe = document.getElementById('exportFrame');
    if (!iframe) { alert("Export iframe missing!"); return; }

    const payload = {
        refString: document.querySelector('.reference-string').textContent,
        frameSize: document.querySelectorAll('.simulation-card')[0].querySelectorAll('.frame').length / document.querySelectorAll('.simulation-card')[0].querySelectorAll('.num-cell').length, // Derived frame size
        results: simInstance.results
    };

    window.showLoading(format === 'img' ? "Generating Optimized Image..." : "Generating Optimized PDF...");
    
    // Pass data down to the invisible iframe
    iframe.contentWindow.postMessage({ type: 'GENERATE_EXPORT', format: format, payload: payload }, '*');
}

let simInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    simInstance = new CacheSimulator();
    window.startSimulation = () => { simInstance.init(); };
    if (!window.javaApp) setTimeout(() => simInstance.init(), 50);

    const exportImgBtn = document.getElementById('exportImgBtn');
    if (exportImgBtn) exportImgBtn.addEventListener('click', () => triggerIframeExport('img'));

    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => triggerIframeExport('pdf'));
});