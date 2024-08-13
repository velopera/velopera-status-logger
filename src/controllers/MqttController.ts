import { logger } from "shared-data";
import { Device } from "../helpers/device";
import { MqttService } from "../services/MqttService";

// Controller class for MQTT communication
export class MqttController {
  private mqttService: MqttService;
  private devices: Map<string, Device>;

  constructor(devices: Map<string, Device>) {
    this.devices = devices;
    this.mqttService = new MqttService();

    // Event listeners for MQTT service events.
    this.mqttService.event.on("connected", () => {
      this.onConnected();
    });
    this.mqttService.event.on("disconnected", () => {
      this.onDisconnected();
    });
    this.mqttService.event.on("message", (topic: string, payload: Buffer) => {
      this.onMessage(topic, payload);
    });
  }

  // Handles the connection event by subscribing to topics.
  private onConnected() {
    this.mqttService.subscribe("ind/#");
    logger.debug("mqttConnected and subscribed to ind/#");
  }

  // Handles the disconnection event.
  private onDisconnected() {
    logger.warn("mqttDisconnected");
  }

  // Handle MQTT message event
  private onMessage(topic: string, payload: Buffer) {
    let tpc = topic.split("/");
    // Call the 'handle' method of the corresponding device
    this.devices.get(tpc[1])?.handle(topic, payload);
  }
}
