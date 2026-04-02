package stackeu;

import javafx.scene.image.WritableImage;
import javafx.embed.swing.SwingFXUtils;
import javax.imageio.ImageIO;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.logging.Logger;
import javafx.scene.SnapshotParameters;
import javafx.application.Platform;
import javafx.concurrent.Worker;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

public class AppFrame extends StackPane {
    private static final Logger LOGGER = Logger.getLogger(AppFrame.class.getName());
    private final AppBridge bridge;
    private final WebView homeView, hiwView, startView, simulateView;

    public AppFrame(Stage stage) {
        bridge = new AppBridge(this);

        // Preload all views into memory immediately
        homeView = createWebView("/index.html");
        hiwView = createWebView("/pages/how.html");
        startView = createWebView("/pages/start.html");
        simulateView = createWebView("/pages/simulate.html");

        // Stack them all on top of each other
        this.getChildren().addAll(simulateView, startView, hiwView, homeView);

        // Hide all except home by setting initial visibility
        homeView.setVisible(true);
        hiwView.setVisible(false);
        startView.setVisible(false);
        simulateView.setVisible(false);
    }

    private WebView createWebView(String path) {
        WebView webView = new WebView();
        webView.getEngine().setJavaScriptEnabled(true);
        webView.setContextMenuEnabled(false); // Disable right-click for app feel

        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                @SuppressWarnings("removal")
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

    public void exportSimulationToImage() {
        Platform.runLater(() -> {
            try {
                WritableImage snapshot = simulateView.snapshot(new SnapshotParameters(), null);
                String timeStamp = new SimpleDateFormat("MMddyy_HHmmss").format(new Date());
                File outputFile = new File(timeStamp + "_PG.png");
                
                ImageIO.write(SwingFXUtils.fromFXImage(snapshot, null), "png", outputFile);
                
                // Alert user that it worked
                simulateView.getEngine().executeScript("alert('Saved successfully as: " + outputFile.getAbsolutePath().replace("\\", "\\\\") + "');");
            } catch (Exception e) {
                e.printStackTrace();
                simulateView.getEngine().executeScript("alert('Error saving image.');");
            }
        });
    }
}