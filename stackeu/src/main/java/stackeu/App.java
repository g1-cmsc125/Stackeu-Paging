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
        
        // 1. Get the screen dimensions dynamically
        Rectangle2D screenBounds = Screen.getPrimary().getVisualBounds();
        
        // 2. Set the scene to match the user's screen dimensions
        Scene scene = new Scene(root, screenBounds.getWidth(), screenBounds.getHeight()); 
        
        primaryStage.setTitle("StackEU App");
        primaryStage.setScene(scene);
        
        // 3. Maximize the window automatically
        primaryStage.setMaximized(true); 
        
        // NOTE: If you want a TRUE fullscreen (like a video game, hiding the Windows taskbar), 
        // comment out the line above and uncomment the line below:
        // primaryStage.setFullScreen(true);
        
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}