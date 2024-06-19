import { logger } from "shared-data";
import { Device } from "../helpers/device";
import { MQTTService } from "../services/MQTTService";

// Controller class for MQTT communication
export class MQTTController {
  private mqttService: MQTTService;
  private devices = new Map<string, Device>();

  constructor(dev: Map<string, Device>) {
    this.devices = dev;
    this.mqttService = new MQTTService();

    // Handle MQTT service events
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

  // Handle MQTT connection event
  private onConnected() {
    // Subscribe to MQTT topic for device status
    this.mqttService.subscribe("ind/#");
    logger.debug("mqttConnected and subscribed to ind/#");
  }

  // Handle MQTT disconnection event
  private onDisconnected() {
    logger.warn("mqttDisconnected");
  }

  // Handle MQTT message event
  private onMessage(topic: string, payload: Buffer) {
    let tpc = topic.split("/"); // tpc[1] = imei
    // Call the 'handle' method of the corresponding device
    this.devices.get(tpc[1])?.handle(topic, payload);
  }
}
