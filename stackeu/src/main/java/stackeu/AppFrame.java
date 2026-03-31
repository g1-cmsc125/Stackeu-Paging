package stackeu;

import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;

public class AppFrame extends StackPane {
    
    public AppFrame(Stage stage) {
        WebView webView = new WebView();
        
        // Enable JavaScript and LocalStorage
        webView.getEngine().setJavaScriptEnabled(true);
        
        // Load the initial index.html
        java.net.URL resource = getClass().getResource("/index.html");
        if (resource != null) {
            webView.getEngine().load(resource.toExternalForm());
        } else {
            System.err.println("CRITICAL ERROR: Could not find /index.html");
        }
        
        this.getChildren().add(webView);
    }
}