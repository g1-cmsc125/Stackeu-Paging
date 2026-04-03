package stackeu;

import javafx.application.Application;
import javafx.geometry.Rectangle2D;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.stage.Screen;
import javafx.stage.Stage; 

public class App extends Application {
    
    @Override
    public void start(Stage primaryStage) {
        AppFrame root = new AppFrame(primaryStage);
        
        Rectangle2D screenBounds = Screen.getPrimary().getVisualBounds();
       
        Scene scene = new Scene(root, screenBounds.getWidth(), screenBounds.getHeight()); 
        
        primaryStage.setTitle("Stackeu");
        try {
            primaryStage.getIcons().add(new Image(getClass().getResourceAsStream("/assets/logo.png")));
        } catch (Exception e) {
            System.err.println("Could not load app icon. Check path: /assets/logo.png");
        }
        primaryStage.setScene(scene);
    
        primaryStage.setMaximized(true); 
        
        // setting up full screen
        // primaryStage.setFullScreen(true);
        
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}