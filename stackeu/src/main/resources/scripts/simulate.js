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

    // Zero-lag initialization: Allows UI to render before heavy math
    setTimeout(() => {
      this.runAllSelected();
      this.renderUI();
      this.setupGlobalControls();
      
      // Trigger the background pre-rendering for the export feature
      setTimeout(() => preRenderExports('export-target'), 1000); 
    }, 50); 
  }

  loadConfig() {
    try {
      let stored = null;
      
      // 1. Ask Java for the config first
      if (window.javaApp && typeof window.javaApp.getConfig === 'function') {
          stored = window.javaApp.getConfig();
      } 
      
      // 2. Fallback for normal web browser testing
      if (!stored || stored === "") {
          stored = sessionStorage.getItem('cacheSimulationConfig') || localStorage.getItem('cacheSimulationConfig');
      }

      if (stored && stored !== "") {
        this.config = JSON.parse(stored);
        this.referenceString = this.config.referenceString.split(/\s+/).map(Number);
        this.frameSize = this.config.frameSize;
      } else {
        // If no config found, safely retreat
        if (window.javaApp) window.javaApp.navigate('start');
        else window.location.href = '../index.html'; 
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  runAllSelected() {
    this.config.selectedAlgorithms.forEach(algoFullName => {
      const algoKey = algoFullName.split(':')[0].trim().toUpperCase();
      
      switch (algoKey) {
        case 'FIFO': this.results[algoFullName] = this.simulateFIFO(); break;
        case 'LRU':  this.results[algoFullName] = this.simulateLRU(); break;
        case 'LFU':  this.results[algoFullName] = this.simulateLFU(); break;
        case 'OPT':  this.results[algoFullName] = this.simulateOPT(); break;
        case 'MFU':  this.results[algoFullName] = this.simulateMFU(); break;
        case 'SECOND CHANCE ALGORITHM': this.results[algoFullName] = this.simulateSecondChance(); break;
        case 'ENHANCED SECOND CHANCE ALGORITHM': this.results[algoFullName] = this.simulateEnhancedSecondChance(); break;
        default: console.warn(`Algorithm ${algoKey} logic not implemented yet.`);
      }
    });
  }

  createStepRecord(page, isHit, frames) {
    return { page, isHit, frames: [...frames] };
  }

  // ==========================================
  // ALGORITHMS (Core Logic)
  // ==========================================

  simulateFIFO() {
    let frames = [], history = [], hits = 0, faults = 0;
    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      if (isHit) {
        hits++;
      } else {
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
          frames.push(page);
          frequencies.set(page, 1);
          arrivalTimes.set(page, time);
        } else {
          let minFreq = Infinity, oldestTime = Infinity, lfuPage = -1;
          for (let p of frames) {
            let freq = frequencies.get(p), arrTime = arrivalTimes.get(p);
            if (freq < minFreq || (freq === minFreq && arrTime < oldestTime)) {
              minFreq = freq; oldestTime = arrTime; lfuPage = p;
            }
          }
          frames = frames.filter(p => p !== lfuPage);
          frequencies.delete(lfuPage);
          arrivalTimes.delete(lfuPage);
          frames.push(page);
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
      if (isHit) {
        hits++;
      } else {
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
          frames.push(page);
          frequencies.set(page, 1);
          arrivalTimes.set(page, time);
        } else {
          let maxFreq = -1, oldestTime = Infinity, mfuPage = -1;
          for (let p of frames) {
            let freq = frequencies.get(p), arrTime = arrivalTimes.get(p);
            if (freq > maxFreq || (freq === maxFreq && arrTime < oldestTime)) {
              maxFreq = freq; oldestTime = arrTime; mfuPage = p;
            }
          }
          frames = frames.filter(p => p !== mfuPage);
          frequencies.delete(mfuPage);
          arrivalTimes.delete(mfuPage);
          
          frames.push(page);
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
    let refBits = []; 
    let pointer = 0;  

    for (let page of this.referenceString) {
      let isHit = frames.includes(page);
      
      if (isHit) {
        hits++;
        let index = frames.indexOf(page);
        refBits[index] = 1; 
      } else {
        faults++;
        if (frames.length < this.frameSize) {
          frames.push(page);
          refBits.push(1); 
        } else {
          while (true) {
            if (refBits[pointer] === 1) {
              refBits[pointer] = 0; 
              pointer = (pointer + 1) % this.frameSize; 
            } else {
              frames[pointer] = page;
              refBits[pointer] = 1; 
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
    let refBits = [];
    let modBits = []; 
    let pointer = 0;

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
          frames.push(page);
          refBits.push(1);
          modBits.push(isModified);
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

  // ==========================================
  // UI RENDERING & ANIMATION
  // ==========================================

  scrollToActiveElement(containerElement, targetElement) {
    if (containerElement && targetElement) {
        const containerCenter = containerElement.clientWidth / 2;
        const activeCellCenter = targetElement.offsetLeft + (targetElement.clientWidth / 2);
        
        containerElement.scrollTo({
            left: activeCellCenter - containerCenter,
            behavior: 'auto' // Use 'auto' instead of 'smooth' to keep up with faster speeds
        });
    }
  }

  renderUI() {
    const refStringHeader = document.querySelector('.reference-string');
    if (refStringHeader) refStringHeader.textContent = this.referenceString.join(', ');

    const mainWrapper = document.querySelector('.simulate-page');
    document.querySelectorAll('.simulation-card').forEach(card => card.remove());

    const actionButtons = document.querySelector('.action-buttons');
    const cols = this.referenceString.length;

    Object.entries(this.results).forEach(([algoName, data]) => {
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
          if (val !== undefined) {
            gridHtml += `<div class="frame filled step-hidden ${isManipulated}" data-col="${idx}">${val}</div>`;
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
                <div class="sim-timer">⏱ <span class="time-sec">0.0</span>s</div>
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
    });
  }

  setupAnimator(card, totalSteps) {
    let currentStep = -1;
    let isPlaying = false;
    let intervalId = null;
    let speedMs = 1000; 
    let timeElapsed = 0.0; 

    const btnPause = card.querySelector('.pause');
    const btnReset = card.querySelector('.reset');
    const btnSkip = card.querySelector('.skip');
    const btnSpeed = card.querySelector('.speed-toggle');
    const timeDisplay = card.querySelector('.time-sec');
    const scrollContainer = card.querySelector('.sim-grid-container');

    const clearHighlights = () => {
      card.querySelectorAll('.active-ref, .active-frame').forEach(el => {
        el.classList.remove('active-ref', 'active-frame', 'frame-hit', 'frame-miss');
      });
    };

    const showStep = (stepIndex) => {
      if (stepIndex >= totalSteps) {
        pauseAnim();
        btnPause.innerHTML = '<span>↺</span>'; 
        return;
      }
      clearHighlights();
      
      const legendSpan = card.querySelector(`span[data-col="${stepIndex}"]`);
      const isHit = legendSpan && legendSpan.classList.contains('hit');

      const elements = card.querySelectorAll(`[data-col="${stepIndex}"]`);
      elements.forEach(el => {
        el.classList.remove('step-hidden');
        el.classList.add('step-visible');
        if (el.classList.contains('num-cell')) el.classList.add('active-ref');
        
        if (el.classList.contains('target-frame')) {
            el.classList.add('active-frame');
            el.classList.add(isHit ? 'frame-hit' : 'frame-miss');
        }
      });

      // Implement the auto-scroll horizontally
      if (elements.length > 0) {
          this.scrollToActiveElement(scrollContainer, elements[0]);
      }
    };

    const playAnim = () => {
      if (currentStep >= totalSteps - 1) resetAnim(); 
      isPlaying = true;
      btnPause.innerHTML = '<span>❚❚</span>';
      intervalId = setInterval(() => {
        currentStep++;
        timeElapsed += (speedMs / 1000); 
        timeDisplay.textContent = timeElapsed.toFixed(1);
        showStep(currentStep);
      }, speedMs);
    };

    const pauseAnim = () => {
      isPlaying = false;
      btnPause.innerHTML = '<span>▶</span>';
      clearInterval(intervalId);
    };

    const resetAnim = () => {
      pauseAnim();
      currentStep = -1;
      timeElapsed = 0.0;
      timeDisplay.textContent = '0.0';
      clearHighlights();
      card.querySelectorAll('.step-visible').forEach(el => {
        el.classList.remove('step-visible');
        el.classList.add('step-hidden');
      });
      scrollContainer.scrollTo({ left: 0, behavior: 'smooth' }); // Scroll back to start
    };

    const skipToEnd = () => {
      pauseAnim();
      clearHighlights();
      let remaining = totalSteps - Math.max(0, currentStep);
      timeElapsed += (remaining * (speedMs / 1000));
      timeDisplay.textContent = timeElapsed.toFixed(1);

      card.querySelectorAll('.step-hidden').forEach(el => {
        el.classList.remove('step-hidden');
        el.classList.add('step-visible');
      });
      currentStep = totalSteps;
      btnPause.innerHTML = '<span>↺</span>';
      
      // Scroll to the very end
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
        sessionStorage.removeItem('cacheSimulationConfig');
        localStorage.removeItem('cacheSimulationConfig');
        
        if (window.javaApp) {
            // FIX: Tell Java to delete the memory when we go back!
            if (typeof window.javaApp.saveConfig === 'function') {
                window.javaApp.saveConfig(""); 
            }
            window.javaApp.navigate(viewName);
        } else {
            window.location.href = fallbackPath;
        }
    };

    // ... (Keep the rest of your restartBtn and mainMenuBtn logic here)
    const restartBtn = document.querySelector('.btn-action.primary');
    if (restartBtn) {
      restartBtn.onclick = (e) => {
          if (e) e.preventDefault();
          clearSessionAndNavigate('start', 'start.html');
      };
    }

    const mainMenuBtn = document.querySelector('.btn-action.secondary');
    if (mainMenuBtn) {
      mainMenuBtn.onclick = (e) => {
          if (e) e.preventDefault();
          clearSessionAndNavigate('home', '../index.html');
      };
    }
  }
} // <--- End of CacheSimulator Class

// ==========================================
// EXPORT LOGIC (Native Pre-Saving)
// ==========================================
let preSavedImgUrl = null;
let preSavedPdfUrl = null;

const showLoading = (text) => {
    const title = document.getElementById('loadingTitle');
    const overlay = document.getElementById('exportLoadingOverlay');
    if (title) title.innerText = text;
    if (overlay) overlay.classList.remove('hidden');
};

const hideLoading = () => {
    const overlay = document.getElementById('exportLoadingOverlay');
    if (overlay) overlay.classList.add('hidden');
};

const getFileName = (extension) => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${mm}${dd}${yy}_${hh}${min}${ss}_PG.${extension}`;
};

const triggerDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// This function silently renders the full table in the background
async function preRenderExports(targetElementId) {
    const target = document.getElementById(targetElementId);
    if (!target) return;

    // Temporarily reveal everything to take the picture
    const hiddenElements = document.querySelectorAll('.step-hidden');
    hiddenElements.forEach(el => {
        el.classList.remove('step-hidden');
        el.classList.add('step-visible');
    });

    const originalOverflow = target.style.overflowX;
    target.style.overflowX = 'visible'; 

    try {
        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(target, { backgroundColor: '#F0EAB6', scale: 2 });
            
            // 1. Create Image Blob
            canvas.toBlob((blob) => {
                preSavedImgUrl = URL.createObjectURL(blob);
            }, 'image/png');

            // 2. Create PDF Blob
            if (window.jspdf) {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('l', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                preSavedPdfUrl = pdf.output('bloburl'); 
            }
        }
    } catch (error) {
        console.error("Background rendering failed:", error);
    } finally {
        // Restore UI state back to hidden
        target.style.overflowX = originalOverflow;
        hiddenElements.forEach(el => {
            el.classList.remove('step-visible');
            el.classList.add('step-hidden');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sim = new CacheSimulator();

    window.startSimulation = () => { sim.init(); };

    if (!window.javaApp) {
        setTimeout(() => sim.init(), 50);
    }

    // Export Button Listeners
    const exportImgBtn = document.getElementById('exportImgBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    if (exportImgBtn) {
        exportImgBtn.addEventListener('click', () => {
            if (preSavedImgUrl) {
                triggerDownload(preSavedImgUrl, getFileName('png'));
            } else {
                showLoading("Still rendering in the background...");
                setTimeout(() => {
                    hideLoading();
                    if (preSavedImgUrl) triggerDownload(preSavedImgUrl, getFileName('png'));
                    else alert("Render failed. Make sure you are not running this directly from the file system without a local server.");
                }, 1500);
            }
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (preSavedPdfUrl) {
                triggerDownload(preSavedPdfUrl, getFileName('pdf'));
            } else {
                showLoading("Still rendering in the background...");
                setTimeout(() => {
                    hideLoading();
                    if (preSavedPdfUrl) triggerDownload(preSavedPdfUrl, getFileName('pdf'));
                    else alert("Render failed. Make sure you are not running this directly from the file system without a local server.");
                }, 1500);
            }
        });
    }
});