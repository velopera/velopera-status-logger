import { config } from "dotenv";
import * as mqtt from "mqtt";
import { logger } from "shared-data";
import { EventEmitter } from "stream";

// Load environment variables from the .env file
config();

// MQTT service class for communication with MQTT broker
export class MQTTService {
  private client: mqtt.MqttClient;
  event: EventEmitter = new EventEmitter();

  constructor() {
    // Connect to the MQTT broker using environment variables
    this.client = mqtt.connect({
      host: process.env.MQTT_HOST,
      port: parseInt(process.env.MQTT_PORT!),
      clientId: process.env.MQTT_USER,
      username: process.env.MQTT_USER,
      password: process.env.MQTT_PASS,
      protocol: "mqtt",
      connectTimeout: 30000,
    });

    // Define MQTT client event handlers
    this.client.on("error", (error: Error) => this.onBrokerError(error));
    this.client.on("disconnect", (disconnect: mqtt.IDisconnectPacket) =>
      this.onBrokerDisconnected(disconnect)
    );
    this.client.on("reconnect", () => this.onBrokerReconnect());
    this.client.on("close", () => this.onBrokerClose());
    this.client.once("connect", (connack: mqtt.IConnackPacket) =>
      this.onBrokerConnected(connack)
    );
    this.client.on("message", (topic: string, payload: Buffer) =>
      this.onMessage(topic, payload)
    );
  }

  // Publish an MQTT message
  publish(topic: string, payload: string) {
    try {
      this.client.publish(topic, payload);
    } catch (error) {
      logger.warn("could not send data mqtt: " + error);
    }
  }

  // Subscribe to an MQTT topic
  subscribe(topic: string) {
    this.client.subscribe(topic);
  }

  // Handle MQTT message event and emit it as an event
  private onMessage(topic: string, payload: Buffer) {
    this.event.emit("message", topic, payload);
  }

  // Handle MQTT disconnection event
  private onBrokerDisconnected(disconnect: mqtt.IDisconnectPacket) {
    logger.debug(
      "mqttBrokerDisconnected " + JSON.stringify(disconnect, null, 2)
    );
    this.event.emit("disconnected");
  }

  // Handle MQTT reconnection event
  private onBrokerReconnect() {
    logger.debug("mqttBrokerReconnect");
  }

  // Handle MQTT broker close event
  private onBrokerClose() {
    logger.debug("mqttBrokerClose. Reconnecting...");
  }

  // Handle MQTT connection error event
  private onBrokerError(error: Error) {
    logger.error("mqtt connect error: " + JSON.stringify(error));
    this.event.emit("error", error);
  }

  // Handle MQTT connection success event
  private async onBrokerConnected(connack: mqtt.IConnackPacket) {
    logger.debug(
      "Connected local mqttBroker connack: " + JSON.stringify(connack)
    );
    this.event.emit("connected");
  }
}
