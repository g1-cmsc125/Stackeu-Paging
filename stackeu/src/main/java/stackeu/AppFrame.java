package stackeu;

import javafx.concurrent.Worker;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

public class AppFrame extends StackPane {
    private AppBridge bridge;
    private WebView homeView; 

    public AppFrame(Stage stage){
        bridge = new AppBridge(this, stage);
        
        // Only load the index.html for now
        homeView = createWebView("/index.html");
        this.getChildren().add(homeView);
    }

    private WebView createWebView(String path) {
        WebView webView = new WebView();
        
        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                // Injects the AppBridge object into JS as 'javaApp'
                window.setMember("javaApp", bridge); 
            }
        });
        
        java.net.URL resource = getClass().getResource(path);
        if (resource != null) {
            webView.getEngine().load(resource.toExternalForm());
        } else {
            System.err.println("CRITICAL ERROR: Could not find " + path);
        }
        
        return webView;
    }

    public void switchView(String viewName) {
        if (homeView == null) return;

        // Hide all views first
        homeView.setVisible(false);

        // Show the requested view
        switch (viewName) {
            case "home":  
                homeView.setVisible(true);  
                homeView.toFront();  
                break;
            // You can add "hiw" and "start" back here later
        }
    }
}