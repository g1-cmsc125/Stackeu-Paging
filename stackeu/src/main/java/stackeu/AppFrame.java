package stackeu;

import javafx.application.Platform;
import javafx.concurrent.Worker;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

public class AppFrame extends StackPane {
    private AppBridge bridge;
    private WebView homeView, hiwView, startView, simulateView;

    public AppFrame(Stage stage) {
        bridge = new AppBridge(this);

        // Preload all views into memory immediately
        homeView = createWebView("/index.html");
        hiwView = createWebView("/pages/how.html");
        startView = createWebView("/pages/start.html");
        simulateView = createWebView("/pages/simulate.html");

        // Stack them all on top of each other
        this.getChildren().addAll(simulateView, startView, hiwView, homeView);

        // Hide all except home
        switchView("home");
    }

    private WebView createWebView(String path) {
        WebView webView = new WebView();
        webView.getEngine().setJavaScriptEnabled(true);
        webView.setContextMenuEnabled(false); // Disable right-click for app feel

        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                window.setMember("javaApp", bridge);
            }
        });

        java.net.URL resource = getClass().getResource(path);
        if (resource != null) {
            webView.getEngine().load(resource.toExternalForm());
        } else {
            System.err.println("CRITICAL ERROR: Cannot find " + path);
        }
        return webView;
    }

    public void switchView(String viewName) {
        Platform.runLater(() -> {
            homeView.setVisible(false);
            hiwView.setVisible(false);
            startView.setVisible(false);
            simulateView.setVisible(false);

            if (viewName.equals("home")) {
                startView.getEngine().executeScript("var btn = document.getElementById('clearInputBtn'); if(btn) btn.click();");
            }

            switch (viewName) {
                case "home": homeView.setVisible(true); homeView.toFront(); break;
                case "how": hiwView.setVisible(true); hiwView.toFront(); break;
                case "start": startView.setVisible(true); startView.toFront(); break;
                case "simulate": simulateView.setVisible(true); simulateView.toFront(); break;
            }
        });
    }

    public void executeOnSimulateView(String script) {
        Platform.runLater(() -> simulateView.getEngine().executeScript(script));
    }
}