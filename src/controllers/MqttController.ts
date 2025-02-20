import { logger } from "shared-data";
import { Device } from "../helpers/device";
import { MqttService } from "../services/MqttService";
import { DeviceGps, DeviceLogin, DeviceStatus } from "../types/types";

let deviceStatusCache: Map<string, DeviceStatus> = new Map();
let deviceLoginCache: Map<string, DeviceLogin> = new Map();
let deviceGpsCache: Map<string, DeviceGps> = new Map();

// Controller class for MQTT communication
export class MqttController {
  private mqttService: MqttService;
  private devices: Map<string, Device>;

  constructor(devices: Map<string, Device>) {
    this.devices = devices;
    this.mqttService = new MqttService();

    // Event listeners for MQTT service events
    this.mqttService.event.on("connected", () => this.onConnected());
    this.mqttService.event.on("disconnected", () => this.onDisconnected());
    this.mqttService.event.on("message", (topic: string, payload: Buffer) => this.onMessage(topic, payload));
  }

  // Handles the connection event by subscribing to topics.
  private onConnected() {
    this.mqttService.subscribe("ind/#");
    logger.debug("MQTT connected and subscribed to ind/#");
  }

  private onDisconnected() {
    logger.warn("MQTT disconnected");
  }

  // Handle MQTT message event
  private onMessage(topic: string, payload: Buffer) {
    let tpc = topic.split("/");
    let key = tpc[1];
    let device = this.devices.get(key);
    if (!device) return;

    try {
      let messageData = JSON.parse(payload.toString());

      if (topic.includes("status")) {
        this.updateCache(deviceStatusCache, key, messageData, device.imei, device.veloId);
      } else if (topic.includes("login")) {
        this.updateCache(deviceLoginCache, key, messageData, device.imei, device.veloId);
      } else if (topic.includes("gps")) {
        this.updateCache(deviceGpsCache, key, messageData, device.imei, device.veloId);
      }

      device.handle(topic, payload);
    } catch (error) {
      logger.error(`Failed to parse message: ${error}`);
    }
  }

  private updateCache(
    cache: Map<string, any>,
    key: string,
    newData: any,
    imei: string,
    veloId: string
  ) {
    const previousData = cache.get(key) || { imei, veloId, data: {} };
    const mergedData = { ...previousData.data };

    for (const field in newData) {
      if (newData[field] !== null && newData[field] !== undefined) {
        mergedData[field] = newData[field];
      }
    }

    cache.set(key, { imei, veloId, data: mergedData });
  }
}
