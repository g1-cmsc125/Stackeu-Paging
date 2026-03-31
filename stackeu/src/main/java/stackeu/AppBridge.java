package stackeu;

import javafx.stage.Stage;

public class AppBridge {
    private AppFrame frame;
    private Stage stage;

    public AppBridge(AppFrame frame, Stage stage){
        this.frame = frame;
        this.stage = stage;
    }

    // Un-commented so JavaScript can call javaApp.navigate('viewName')
    public void navigate(String viewName) {
        frame.switchView(viewName);
    }
}