import { registerRootComponent } from "expo";
import App from "./App";

// Registering the background task module ensures TaskManager.defineTask runs
// at startup so the OS can invoke it.
import "./src/background";

registerRootComponent(App);
