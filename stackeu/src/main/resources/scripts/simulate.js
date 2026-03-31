

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

    this.runAllSelected();
    this.renderUI();
    this.setupGlobalControls();
  }

  loadConfig() {
    try {
      const stored = localStorage.getItem('cacheSimulationConfig');
      if (stored) {
        this.config = JSON.parse(stored);
        this.referenceString = this.config.referenceString.split(/\s+/).map(Number);
        this.frameSize = this.config.frameSize;
      } else {
        window.location.href = 'index.html'; // Redirect if no config
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  runAllSelected() {
    this.config.selectedAlgorithms.forEach(algoFullName => {
      // Extract just the acronym (e.g., "FIFO" from "FIFO: First-In, First-Out")
      const algoKey = algoFullName.split(':')[0].trim().toUpperCase();
      
      switch (algoKey) {
        case 'FIFO': this.results[algoFullName] = this.simulateFIFO(); break;
        case 'LRU':  this.results[algoFullName] = this.simulateLRU(); break;
        case 'LFU':  this.results[algoFullName] = this.simulateLFU(); break;
        case 'OPT':  this.results[algoFullName] = this.simulateOPT(); break;
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

  // ==========================================
  // UI RENDERING
  // ==========================================

  renderUI() {
    // 1. Set the main header reference string
    const refStringHeader = document.querySelector('.reference-string');
    if (refStringHeader) {
      refStringHeader.textContent = this.referenceString.join(', ');
    }

    // 2. Clear out any hardcoded template cards in the HTML
    const mainWrapper = document.querySelector('.simulate-page');
    document.querySelectorAll('.simulation-card').forEach(card => card.remove());

    // 3. Render a card for each selected algorithm
    const actionButtons = document.querySelector('.action-buttons');
    const cols = this.referenceString.length;

    Object.entries(this.results).forEach(([algoName, data]) => {
      const card = document.createElement('div');
      card.className = 'simulation-card';

      // --- Build the Grid HTML ---
      // Inline CSS grid template to guarantee it matches reference string length dynamically
     let gridHtml = `<div class="sim-grid" style="display: grid; grid-template-columns: repeat(${cols}, minmax(64px, 1fr)); gap: 8px; margin-bottom: 15px;">`;

      // Row 1: Reference String
      data.history.forEach(step => {
        gridHtml += `<div class="num-cell">${step.page}</div>`;
      });

      // Rows 2 to N: Frames (Transposing step arrays to rows)
      for (let f = 0; f < this.frameSize; f++) {
        data.history.forEach(step => {
          let val = step.frames[f];
          if (val !== undefined) {
            gridHtml += `<div class="frame filled">${val}</div>`;
          } else {
            gridHtml += `<div class="frame empty"></div>`;
          }
        });
      }
      gridHtml += `</div>`; // Close .sim-grid

      // Row N+1: Legends (Hits/Misses)
      let legendHtml = `<div class="legend-row" style="display: grid; grid-template-columns: repeat(${cols}, minmax(64px, 1fr)); gap: 8px;">`;
      data.history.forEach(step => {
        if (step.isHit) {
          legendHtml += `<span class="hit">Hit</span>`;
        } else {
          legendHtml += `<span class="miss">Miss</span>`;
        }
      });
      legendHtml += `</div>`;

      // Assemble Card
      card.innerHTML = `
        <div class="sim-header">
            <div class="algo-info">
                <h2 class="algo-name">${algoName}</h2>
            </div>
            <div class="controls">
                <button class="btn-ctrl pause"><span>❚❚</span></button>
                <button class="btn-ctrl reset"><span>↺</span></button>
                <button class="btn-ctrl skip"><span>▶▶</span></button>
            </div>
        </div>
        <div class="sim-grid-container">
            ${gridHtml}
            ${legendHtml}
        </div>
        <footer class="sim-footer">
            <p class="stat-summary">Total page faults: ${data.faults} | Total hits: ${data.hits}</p>
        </footer>
      `;

      mainWrapper.insertBefore(card, actionButtons);
    });
  }

  setupGlobalControls() {
    // Make the Restart button loop back and clear config (optional, or just go back)
    const restartBtn = document.querySelector('.btn-action.primary');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CacheSimulator();
});