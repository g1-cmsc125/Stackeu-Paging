module stackeu {
    requires javafx.controls;
    requires javafx.fxml;
    requires javafx.web;
    requires jdk.jsobject;
    
    opens stackeu to javafx.fxml;
    exports stackeu;
}