package stackeu;

import javafx.application.Application;
import javafx.geometry.Rectangle2D;
import javafx.scene.Scene;
import javafx.stage.Screen;
import javafx.stage.Stage;

public class App extends Application {
    
    @Override
    public void start(Stage primaryStage) {
        AppFrame root = new AppFrame(primaryStage);
        
        Rectangle2D screenBounds = Screen.getPrimary().getVisualBounds();
       
        Scene scene = new Scene(root, screenBounds.getWidth(), screenBounds.getHeight()); 
        
        primaryStage.setTitle("Stackeu");
        primaryStage.setScene(scene);
    
        primaryStage.setMaximized(true); 
        
        // setting up full screen
        primaryStage.setFullScreen(true);
        
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}