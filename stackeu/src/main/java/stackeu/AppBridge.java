package stackeu;

public class AppBridge {
    private AppFrame frame;
    private String simulationConfig = ""; // Holds the data between screens

    public AppBridge(AppFrame frame) {
        this.frame = frame;
    }

    public void navigate(String viewName) {
        frame.switchView(viewName);
    }

    public void triggerSimulation() {
        frame.executeOnSimulateView("if(typeof window.startSimulation === 'function') { window.startSimulation(); }");
    }

    public void exportToImage() {
        frame.exportSimulationToImage();
    }

    // --- NEW: Data sharing methods ---
    public void saveConfig(String configStr) {
        this.simulationConfig = configStr;
    }

    public String getConfig() {
        return this.simulationConfig;
    }
}