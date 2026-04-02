package stackeu;

import javafx.stage.FileChooser;
import java.nio.file.Files;
import java.util.Base64;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.logging.Logger;
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

        homeView = createWebView("/index.html");
        hiwView = createWebView("/pages/how.html");
        startView = createWebView("/pages/start.html");
        simulateView = createWebView("/pages/simulate.html");

        this.getChildren().addAll(simulateView, startView, hiwView, homeView);

        homeView.setVisible(true);
        hiwView.setVisible(false);
        startView.setVisible(false);
        simulateView.setVisible(false);
    }

    private WebView createWebView(String path) {
        WebView webView = new WebView();
        webView.getEngine().setJavaScriptEnabled(true);
        webView.setContextMenuEnabled(false); 

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
                case "simulate": 
                    simulateView.setVisible(true); 
                    simulateView.toFront(); 
                    simulateView.getEngine().executeScript("try { if(typeof window.startSimulation === 'function') window.startSimulation(); } catch(e) {}");
                    break;
            }
        });
    }

    public void executeOnSimulateView(String script) {
        Platform.runLater(() -> simulateView.getEngine().executeScript(script));
    }

    // --- Native Save As Dialog for Image ---
    public void saveImageFromBase64(String base64) {
        Platform.runLater(() -> {
            try {
                FileChooser fileChooser = new FileChooser();
                fileChooser.setTitle("Save Simulation Image");
                fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("PNG Files", "*.png"));
                String timeStamp = new SimpleDateFormat("MMddyy_HHmmss").format(new Date());
                fileChooser.setInitialFileName(timeStamp + "_PG.png");

                File file = fileChooser.showSaveDialog(simulateView.getScene().getWindow());
                
                if (file != null) {
                    String base64Data = base64.substring(base64.indexOf(",") + 1);
                    byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                    Files.write(file.toPath(), decodedBytes);
                    
                    simulateView.getEngine().executeScript("alert('Image saved successfully!'); typeof window.hideLoading === 'function' && window.hideLoading();");
                } else {
                    simulateView.getEngine().executeScript("typeof window.hideLoading === 'function' && window.hideLoading();");
                }
            } catch (Exception e) {
                e.printStackTrace();
                simulateView.getEngine().executeScript("alert('Error saving Image.'); typeof window.hideLoading === 'function' && window.hideLoading();");
            }
        });
    }

    // --- Native Save As Dialog for PDF ---
    public void savePdfFromBase64(String base64) {
        Platform.runLater(() -> {
            try {
                FileChooser fileChooser = new FileChooser();
                fileChooser.setTitle("Save Simulation PDF");
                fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("PDF Files", "*.pdf"));
                String timeStamp = new SimpleDateFormat("MMddyy_HHmmss").format(new Date());
                fileChooser.setInitialFileName(timeStamp + "_PG.pdf");

                File file = fileChooser.showSaveDialog(simulateView.getScene().getWindow());
                
                if (file != null) {
                    String base64Data = base64.substring(base64.indexOf(",") + 1);
                    byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                    Files.write(file.toPath(), decodedBytes);
                    
                    simulateView.getEngine().executeScript("alert('PDF saved successfully!'); typeof window.hideLoading === 'function' && window.hideLoading();");
                } else {
                    simulateView.getEngine().executeScript("typeof window.hideLoading === 'function' && window.hideLoading();");
                }
            } catch (Exception e) {
                e.printStackTrace();
                simulateView.getEngine().executeScript("alert('Error saving PDF.'); typeof window.hideLoading === 'function' && window.hideLoading();");
            }
        });
    }
}