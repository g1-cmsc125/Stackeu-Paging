package stackeu;

public class AppBridge {
    private AppFrame frame;
    private String simulationConfig = ""; 

    public AppBridge(AppFrame frame) {
        this.frame = frame;
    }

    public void navigate(String viewName) {
        frame.switchView(viewName);
    }

    public void triggerSimulation() {
        frame.executeOnSimulateView("if(typeof window.startSimulation === 'function') { window.startSimulation(); }");
    }

    // Receives full Image Base64 from JS and opens Save As prompt
    public void saveImage(String base64String) {
        frame.saveImageFromBase64(base64String);
    }

    // Receives full PDF Base64 from JS and opens Save As prompt
    public void savePdf(String base64String) {
        frame.savePdfFromBase64(base64String);
    }

    public void saveConfig(String configStr) {
        this.simulationConfig = configStr;
    }

    public String getConfig() {
        return this.simulationConfig;
    }
}