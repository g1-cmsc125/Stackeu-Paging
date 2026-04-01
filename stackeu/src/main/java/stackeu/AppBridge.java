package stackeu;

public class AppBridge {
    private AppFrame frame;

    public AppBridge(AppFrame frame) {
        this.frame = frame;
    }

    public void navigate(String viewName) {
        frame.switchView(viewName);
    }

    public void triggerSimulation() {
        frame.executeOnSimulateView("if(typeof window.startSimulation === 'function') { window.startSimulation(); }");
    }
}