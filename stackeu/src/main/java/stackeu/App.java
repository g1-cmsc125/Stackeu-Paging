package stackeu;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class App extends Application { // <-- Changed back to Application
    
    @Override
    public void start(Stage primaryStage) {
        // Initialize your custom layout frame
        AppFrame root = new AppFrame(primaryStage);
        
        // Create the scene with default dimensions
        Scene scene = new Scene(root, 1024, 768); 
        
        primaryStage.setTitle("StackEU App");
        primaryStage.setScene(scene);
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}