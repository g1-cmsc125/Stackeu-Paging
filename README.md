# ⚛️ STACK•EU

## 📖 About

**STACK•EU** is a page replacement algorithm simulator built using Java and its extended libraries as a laboratory requirement for CMSC 125 (Operating Systems). It brings the abstract world of memory management to life through an interactive, visual interface — letting users see exactly how pages are loaded, hit, and evicted from memory frames, step by step.

The project simulates core page replacement algorithms studied in operating systems, providing real-time visual feedback through an animated memory grid, playback controls, and detailed performance metrics.

### ✨ The project features:
* **7 Page Replacement Algorithms:** Simulate and compare FIFO, LRU, LFU, Optimal (OPT), MFU, Second Chance (Clock), and Enhanced Second Chance.
* **Animated Memory Grid:** Watch memory frames update in real-time. The grid is color-coded to highlight active pages, targeted frames, and visually distinguish between Page Hits and Page Faults (Misses).
* **Three Input Modes:** Feed the simulator via random generation, manual reference string input, or by uploading a `.txt` file — your choice.
* **Interactive Playback & Export:** Control the simulation speed with a dynamic slider, pause/play/skip through the steps, and instantly export the final results as a high-resolution PNG or PDF.


## 🎮 How to Use

### 1. Input Your Configuration

When the simulator launches, choose how to provide your reference string and memory frames:

| Mode | Description |
| :--- | :--- |
| **Random** | The simulator auto-generates a random reference string and frame size. |
| **Manual Input** | Enter your reference string and frame size directly through the on-screen input panel. Use space as delimiter. |
| **Text File** | Load data from a `.txt` file formatted to the simulator's specification (Line 1: `frames:X`, Line 2: `reference string`). |

**Valid input ranges:**
* **Reference String Length:** 10 – 40 page references
* **Page Number Values:** 0 – 20
* **Frame Size:** 3 – 10

### 2. Choose Page Replacement Algorithms

After entering your configuration data, select one or more of the available algorithms to simulate concurrently:
* First-In, First-Out (FIFO)
* Least Recently Used (LRU)
* Optimal Page Replacement (OPT)
* Least Frequently Used (LFU)
* Most Frequently Used (MFU)
* Second Chance Algorithm
* Enhanced Second Chance Algorithm

### 3. Run the Simulation

Click **Simulate** to transition to the viewing dashboard. The animated grid will begin executing the algorithms step-by-step. You can control the flow using the interactive playback buttons (Play, Pause, Reset, Skip) and adjust the animation speed via the slider.

### 4. Review the Results

Once the simulation completes, the metrics footer will automatically reveal the total performance data for each algorithm:
* **Total Page Faults (Misses)**
* **Total Page Hits**

### 5. Export and Compare

Easily compare the visual grids of different algorithms side-by-side. Click the **Export as Image** or **Export as PDF** buttons to save a snapshot of your simulation for your laboratory reports.

## ⚙️ How to Build and Run

### Prerequisites
* **Java 11+** must be installed on your machine.
* **Maven** is *not* required — see Option A below.

---

### Option A: Using the Maven Wrapper *(Recommended)*
No Maven installation needed. The wrapper downloads everything automatically.

1. Clone this repository:
   ```bash
   git clone https://github.com/g1-cmsc125/Stackeu-Paging.git
   cd Stackeu-Paging/stackeu
   ```
2. Run the build command using the wrapper:
   * **Windows:**
     ```cmd
     .\mvnw.cmd clean package
     ```
   * **Mac/Linux:**
     ```bash
     ./mvnw clean package
     ```
3. Find the compiled `.jar` (and `.exe` on Windows) in the `/target` directory.

---

### Option B: Using Maven Directly
If you already have Maven installed:

1. Open a terminal in the `stackeu` project root (where `pom.xml` is located).
2. Run:
   ```bash
   mvn clean package
   ```
3. Check the `/target` folder for the built artifacts.

---

### Option C: Running the JAR
After building, launch the application directly:

```bash
java -jar target/stackeu.jar
```
---


## 👨‍💻 The Developers

This project was developed by **Group 1** for CMSC 125:
* Angela Almazan
* Mac Alvarico
* Desirre Barbosa
* Zsyvette Bugho
