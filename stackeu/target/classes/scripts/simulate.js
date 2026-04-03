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
      // this.setupGlobalControls();
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
      const key = algoFullName.toUpperCase();
      
      if (key.indexOf('FIFO') !== -1) this.results[algoFullName] = this.simulateFIFO();
      else if (key.indexOf('LRU') !== -1) this.results[algoFullName] = this.simulateLRU();
      else if (key.indexOf('LFU') !== -1) this.results[algoFullName] = this.simulateLFU();
      else if (key.indexOf('OPT') !== -1) this.results[algoFullName] = this.simulateOPT();
      else if (key.indexOf('MFU') !== -1) this.results[algoFullName] = this.simulateMFU();
      else if (key.indexOf('ENHANCED') !== -1) this.results[algoFullName] = this.simulateEnhancedSecondChance();
      else if (key.indexOf('SECOND CHANCE') !== -1) this.results[algoFullName] = this.simulateSecondChance();
      else console.warn(`Algorithm logic not found for: ${algoFullName}`);
    });
  }

  createStepRecord(page, isHit, frames) { return { page, isHit, frames: [...frames] }; }

  // ==========================================
  // CORE ALGORITHMS (Updated & In-Place)
  // ==========================================

  simulateFIFO() {
    let frames = [], history = [], hits = 0, faults = 0;
    let pointer = 0;
    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      if (isHit) hits++;
      else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page);
        } else {
          frames[pointer] = page; // In-place replacement
          pointer = (pointer + 1) % this.frameSize;
        }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateLRU() {
    let frames = [], history = [], hits = 0, faults = 0;
    let lastUsed = new Map(), time = 0;
    for (let page of this.referenceString) {
      time++;
      let isHit = frames.includes(page);
      if (isHit) {
        hits++;
        lastUsed.set(page, time);
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page);
          lastUsed.set(page, time);
        } else {
          let lruPage = -1, oldestTime = Infinity, lruIndex = -1;
          for (let i = 0; i < frames.length; i++) {
            let p = frames[i];
            let lu = lastUsed.get(p);
            if (lu < oldestTime) { oldestTime = lu; lruPage = p; lruIndex = i; }
          }
          frames[lruIndex] = page; // In-place visual replacement
          lastUsed.delete(lruPage);
          lastUsed.set(page, time);
        }
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
          frames.push(page);
          frequencies.set(page, 1);
          arrivalTimes.set(page, time);
        } else {
          let minFreq = Infinity, oldestTime = Infinity, lfuIndex = -1, lfuPage = -1;
          for (let i = 0; i < frames.length; i++) {
            let p = frames[i];
            let freq = frequencies.get(p), arrTime = arrivalTimes.get(p);
            // Replace lowest frequency (Tie-breaker: Oldest Arrival)
            if (freq < minFreq || (freq === minFreq && arrTime < oldestTime)) {
              minFreq = freq; oldestTime = arrTime; lfuIndex = i; lfuPage = p;
            }
          }
          frames[lfuIndex] = page;
          frequencies.delete(lfuPage);
          arrivalTimes.delete(lfuPage);
          frequencies.set(page, 1);
          arrivalTimes.set(page, time);
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
        if (frames.length < this.frameSize) {
            frames.push(page);
        } else {
          let furthestUse = -1, optVictimIndex = -1;
          for (let j = 0; j < frames.length; j++) {
            let nextUse = this.referenceString.indexOf(frames[j], i + 1);
            if (nextUse === -1) { optVictimIndex = j; break; }
            if (nextUse > furthestUse) { furthestUse = nextUse; optVictimIndex = j; }
          }
          frames[optVictimIndex] = page; 
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
          frames.push(page);
          frequencies.set(page, 1);
          arrivalTimes.set(page, time);
        } else {
          let maxFreq = -1, oldestTime = Infinity, mfuIndex = -1, mfuPage = -1;
          for (let i = 0; i < frames.length; i++) {
            let p = frames[i];
            let freq = frequencies.get(p), arrTime = arrivalTimes.get(p);
            // Replace highest frequency (Tie-breaker: Oldest Arrival)
            if (freq > maxFreq || (freq === maxFreq && arrTime < oldestTime)) {
              maxFreq = freq; oldestTime = arrTime; mfuIndex = i; mfuPage = p;
            }
          }
          frames[mfuIndex] = page;
          frequencies.delete(mfuPage);
          arrivalTimes.delete(mfuPage);
          frequencies.set(page, 1);
          arrivalTimes.set(page, time);
        }
      }
      history.push(this.createStepRecord(page, isHit, frames));
    }
    return { history, hits, faults };
  }

  simulateSecondChance() {
    let frames = [], history = [], hits = 0, faults = 0;
    let refBits = new Map(), fifoQueue = [];  
    
    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      if (isHit) {
        hits++;
        refBits.set(page, 1); // Set to 1 on reference
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page);
          fifoQueue.push(page);
          refBits.set(page, 0); // Start with 0 so it gets replaced if not referenced again
        } else {
          while (true) {
            let candidate = fifoQueue.shift(); // Inspect oldest page
            if (refBits.get(candidate) === 0) {
              // Found victim
              let frameIdx = frames.indexOf(candidate);
              frames[frameIdx] = page;
              fifoQueue.push(page);
              refBits.delete(candidate);
              refBits.set(page, 0); 
              break;
            } else {
              // Give second chance
              refBits.set(candidate, 0); 
              fifoQueue.push(candidate);
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
    let refBits = new Map(), modBits = new Map(), loadOrder = [];
    
    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      // Simulated modify bit (even pages = modified)
      let isModified = (page % 2 === 0) ? 1 : 0; 

      if (isHit) {
        hits++;
        refBits.set(page, 1); 
        if (isModified) modBits.set(page, 1); 
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page);
          loadOrder.push(page);
          refBits.set(page, 1); 
          modBits.set(page, isModified);
        } else {
          let bestClass = 4, victimPage = -1;
          
          // Categorize into four classes: (r << 1) | m gives 0, 1, 2, or 3
          for (let candidate of loadOrder) {
            let r = refBits.get(candidate) || 0;
            let m = modBits.get(candidate) || 0;
            let c = (r << 1) | m; 
            
            // Find lowest non-empty class
            if (c < bestClass) {
              bestClass = c;
              victimPage = candidate;
              if (bestClass === 0) break; // Found absolute best victim
            }
          }

          let frameIdx = frames.indexOf(victimPage);
          frames[frameIdx] = page;
          
          loadOrder = loadOrder.filter(p => p !== victimPage);
          loadOrder.push(page);

          refBits.delete(victimPage);
          modBits.delete(victimPage);
          
          refBits.set(page, 1); 
          modBits.set(page, isModified);
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
        try { sessionStorage.removeItem('cacheSimulationConfig'); } catch(e) {}
        try { localStorage.removeItem('cacheSimulationConfig'); } catch(e) {}

        if (window.javaApp) {
            try { window.javaApp.saveConfig(""); } catch(e) {}  // ← isolated
            try { window.javaApp.navigate(viewName); } catch(e) {} // ← always runs
        } else {
            window.location.href = fallbackPath;
        }
    };

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearSessionAndNavigate('start', 'start.html');
    });

    const mainMenuBtn = document.getElementById('mainMenuBtn');
    if (mainMenuBtn) mainMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearSessionAndNavigate('home', '../index.html');
    });
}
} 

// ==========================================
// SUPER-FAST HIDDEN EXPORT LOGIC
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

function calculatePdfLayout(canvas) {
    const ptWidth = canvas.width * 0.75;
    const ptHeight = canvas.height * 0.75;
    
    const MIN_PDF_WIDTH = 842; 
    const pdfPageWidth = Math.max(ptWidth, MIN_PDF_WIDTH);
    
    const orientation = pdfPageWidth > ptHeight ? 'l' : 'p';
    const xOffset = (pdfPageWidth > ptWidth) ? (pdfPageWidth - ptWidth) / 2 : 0;

    return { ptWidth, ptHeight, pdfPageWidth, orientation, xOffset };
}

async function triggerFastExport(format) {
    window.showLoading(format === 'img' ? "Generating Image..." : "Generating PDF...");

    const container = document.createElement('div');
    container.id = 'temp-export-container';
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = 'max-content'; 
    container.style.minWidth = '1200px'; 
    container.style.backgroundColor = '#F0EAB6';
    container.style.padding = '40px';
    container.style.color = '#606844';
    container.style.fontFamily = "'Segoe UI', Arial, sans-serif";

    let html = `
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="margin: 0; font-size: 2.5rem;">STACK•EU Results</h1>
            <p style="font-size: 1.2rem; color: #6A6928; font-weight: bold;">Reference String: ${document.querySelector('.reference-string').textContent}</p>
        </div>
    `;

    for(const [algo, data] of Object.entries(simInstance.results)) {
        html += `<div style="background: #f1f8e6; padding: 30px; border-radius: 20px; border: 3px solid #cddba9; margin-bottom: 40px;">
                    <h2 style="color: #606844; margin-top: 0;">${algo}</h2>
                    <table style="width: 100%; border-collapse: separate; border-spacing: 4px; text-align: center;"><tr>`;

        data.history.forEach(step => { html += `<th style="font-size: 1.3rem; color: #6A6928; padding-bottom: 10px;">${step.page}</th>`; });
        html += `</tr>`;

        let maxFrames = simInstance.frameSize;
        for(let f=0; f < maxFrames; f++) {
            html += `<tr>`;
            data.history.forEach(step => {
                let val = step.frames[f];
                if(val !== undefined) {
                    let isTarget = val === step.page;
                    let bg = isTarget ? (step.isHit ? '#5f7adb' : '#d8737f') : '#cdbf72';
                    let color = 'white';
                    html += `<td style="height: 40px; min-width: 40px; border-radius: 8px; font-weight: bold; font-size: 1.2rem; background-color: ${bg}; color: ${color};">${val}</td>`;
                } else {
                    html += `<td style="height: 40px; min-width: 40px; border-radius: 8px; background-color: rgba(205, 219, 169, 0.3);"></td>`;
                }
            });
            html += `</tr>`;
        }

        html += `<tr>`;
        data.history.forEach(step => {
            let text = step.isHit ? 'Hit' : 'Miss';
            let color = step.isHit ? '#5f7adb' : '#d8737f';
            html += `<td style="font-size: 1.1rem; font-weight: bold; padding-top: 5px; color: ${color};">${text}</td>`;
        });
        html += `</tr></table>`;
        html += `<div style="text-align: right; font-size: 1.2rem; color: #6A6928; font-weight: bold; margin-top: 15px;">Total Faults: ${data.faults} &nbsp;|&nbsp; Total Hits: ${data.hits}</div></div>`;
    }

    container.innerHTML = html;
    document.body.appendChild(container);

    await new Promise(r => setTimeout(r, 100));

    try {
        const targetWidth = container.scrollWidth;
        const targetHeight = container.scrollHeight;

        const canvas = await html2canvas(container, {
            scale: 1.5,
            backgroundColor: '#F0EAB6',
            logging: false,
            width: targetWidth,
            height: targetHeight,
            windowWidth: targetWidth,
            windowHeight: targetHeight
        });

        if (format === 'img') {
            const base64Img = canvas.toDataURL('image/png');
            if (window.javaApp) {
                window.javaApp.saveImage(base64Img); 
            } else {
                const link = document.createElement('a');
                link.download = "Simulation_Results.png";
                link.href = base64Img;
                link.click();
                window.hideLoading();
            }
        } else {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            
            const layout = calculatePdfLayout(canvas);
            
            const customPdf = new jsPDF(layout.orientation, 'pt', [layout.pdfPageWidth, layout.ptHeight]);
            customPdf.addImage(imgData, 'PNG', layout.xOffset, 0, layout.ptWidth, layout.ptHeight);
            
            const base64Pdf = customPdf.output('datauristring');

            if (window.javaApp) {
                window.javaApp.savePdf(base64Pdf); 
            } else {
                customPdf.save("Simulation_Results.pdf");
                window.hideLoading();
            }
        }
    } catch (err) {
        console.error("Export failed:", err);
        alert("Failed to export.");
        window.hideLoading();
    } finally {
        document.body.removeChild(container);
    }
}

let simInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    simInstance = new CacheSimulator();
    simInstance.setupGlobalControls();
    window.startSimulation = () => { simInstance.init(); };
    if (!window.javaApp) setTimeout(() => simInstance.init(), 50);

    const exportImgBtn = document.getElementById('exportImgBtn');
    if (exportImgBtn) exportImgBtn.addEventListener('click', () => triggerFastExport('img'));

    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => triggerFastExport('pdf'));
});

// ==========================================
// BULLETPROOF NAVIGATION LOGIC
// ==========================================
window.goToPage = function(viewName, fallbackPath) {
    // 1. Wipe temporary browser memory safely
    try {
        sessionStorage.removeItem('cacheSimulationConfig'); 
        localStorage.removeItem('cacheSimulationConfig');
    } catch(e) { console.warn("Could not clear local storage."); }
    
    // 2. Wipe Java memory and route
    if (window.javaApp) { 
        try { 
            window.javaApp.saveConfig(""); 
        } catch (e) {} 
        window.javaApp.navigate(viewName); 
    } else { 
        // 3. Fallback for testing in normal Chrome/Edge
        window.location.href = fallbackPath; 
    }
};