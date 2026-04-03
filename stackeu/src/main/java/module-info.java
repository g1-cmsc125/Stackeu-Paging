module stackeu {
    requires transitive javafx.graphics;
    requires javafx.controls;
    requires javafx.fxml;
    requires javafx.web;
    requires jdk.jsobject;
    requires javafx.swing;
    requires java.desktop;
    requires java.logging;
    
    opens stackeu to javafx.fxml;
    exports stackeu;
}