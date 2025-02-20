import { logger } from "shared-data";
import { Device } from "../helpers/device";
import { MqttService } from "../services/MqttService";
import { DeviceGps, DeviceGpsCache, DeviceLogin, DeviceLoginCache, DeviceStatus, DeviceStatusCache } from "../types/types";

// Map to cache the latest states of devices.
let deviceStatusCache: Map<string, DeviceStatus> = new Map<string, DeviceStatus>();
let deviceLoginCache: Map<string, DeviceLogin> = new Map<string, DeviceLogin>();
let deviceGpsCache: Map<string, DeviceGps> = new Map<string, DeviceGps>();

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

    // Subscribe to device events and update the cache.
    // When device status, login, gps data changes, update the respective cache.
    this.devices.forEach((device, key) => {
      device.on("deviceStatus", (statusData) => {
        this.handleDeviceStatus(key, statusData, device.imei, device.veloId);
      });
      device.on("deviceLogin", (loginData) => {
        this.handleDeviceLogin(key, loginData, device.imei, device.veloId);
      });
      device.on("deviceGps", (gpsData) => {
        this.handleDeviceGps(key, gpsData, device.imei, device.veloId);
      });
    });
  }

  // Handles the connection event by subscribing to topics.
  private onConnected() {
    this.mqttService.subscribe("ind/#");
    logger.debug("MQTT connected and subscribed to ind/#");
  }

  // Handles the disconnection event.
  private onDisconnected() {
    logger.debug("MQTT disconnected");
  }

  // Processes received MQTT messages by delegating to the corresponding device.
  private onMessage(topic: string, payload: Buffer) {
    let tpc = topic.split("/");
    this.devices.get(tpc[1])?.handle(topic, payload);
  }

  // Handle the received device status data, updating the cache.
  private handleDeviceStatus(
    key: string,
    statusData: any,
    imei: string,
    veloId: string
  ) {
    // Retrieve the previous status from the cache, if available.
    const previousStatus = deviceStatusCache.get(key);

    // Create an updated status by merging the new and old data.
    const updatedStatus = previousStatus ? { ...previousStatus.statusData } : {};

    // Update only fields that are not null or undefined.
    for (const field in statusData) {
      if (statusData[field] !== null && statusData[field] !== undefined) {
        updatedStatus[field] = statusData[field];
      }
    }

    // Prepare the data to send to the api.
    const dataToSend = {
      imei: imei || previousStatus?.imei || "Unknown",
      veloId: veloId || previousStatus?.veloId || "Unknown",
      statusData: updatedStatus,
    };

    // Update the cache and send the updated status to the api.
    deviceStatusCache.set(key, dataToSend);
  }

  // Handle the received device login data, updating the cache.
  private handleDeviceLogin(
    key: string,
    loginData: any,
    imei: string,
    veloId: string
  ) {
    // Retrieve the previous login data from the cache, if available.
    const previousLogin = deviceLoginCache.get(key);

    // Create an updated login by merging the new and old data.
    const updatedLogin = previousLogin ? { ...previousLogin.loginData } : {};

    // Update only fields that are not null or undefined.
    for (const field in loginData) {
      if (loginData[field] !== null && loginData[field] !== undefined) {
        updatedLogin[field] = loginData[field];
      }
    }

    // Prepare the data to send to the api.
    const dataToSend = {
      imei: imei || previousLogin?.imei || "Unknown",
      veloId: veloId || previousLogin?.veloId || "Unknown",
      loginData: updatedLogin,
    };

    // Update the cache and send the updated login data to the api.
    deviceLoginCache.set(key, dataToSend);
  }

  // Handle the received device login data, updating the cache.
  private handleDeviceGps(
    key: string,
    gpsData: any,
    imei: string,
    veloId: string
  ) {
    // Retrieve the previous login data from the cache, if available.
    const previousGps = deviceGpsCache.get(key);

    // Create an updated login by merging the new and old data.
    const updatedGps = previousGps ? { ...previousGps.gpsData } : {};

    // Update only fields that are not null or undefined.
    for (const field in gpsData) {
      if (gpsData[field] !== null && gpsData[field] !== undefined) {
        updatedGps[field] = gpsData[field];
      }
    }

    // Prepare the data to send to the api.
    const dataToSend = {
      imei: imei || previousGps?.imei || "Unknown",
      veloId: veloId || previousGps?.veloId || "Unknown",
      gpsData: updatedGps,
    };

    // Update the cache and send the updated login data to the api.
    deviceGpsCache.set(key, dataToSend);
  }
}

// Function to return the cached last status of devices.
export const getCachedStatusMessage = (): DeviceStatusCache => {
  let obj = Object.create(null) as DeviceStatusCache;
  for (let [key, value] of deviceStatusCache) {
    obj[key] = value as DeviceStatus;
  }
  return obj;
};

// Function to return the cached last logins of devices.
export const getCachedLoginMessage = (): DeviceLoginCache => {
  let obj = Object.create(null) as DeviceLoginCache;
  for (let [key, value] of deviceLoginCache) {
    obj[key] = value as DeviceLogin;
  }
  return obj;
};

// Function to return the cached last gps of devices.
export const getCachedGpsMessage = (): DeviceGpsCache => {
  let obj = Object.create(null) as DeviceGpsCache;
  for (let [key, value] of deviceGpsCache) {
    obj[key] = value as DeviceGps;
  }
  return obj;
};

// Function to return the cached last status, login and gps of a specified device
export const getDeviceInfoById = (veloId: string) => {
  let status = null;
  let login = null;
  let gps = null;

  // Check device status cache
  for (let [, value] of deviceStatusCache) {
    if (value.veloId === veloId) {
      status = value;
      break;
    }
  }

  // Check device login cache
  for (let [, value] of deviceLoginCache) {
    if (value.veloId === veloId) {
      login = value;
      break;
    }
  }

  // Check device gps cache
  for (let [, value] of deviceGpsCache) {
    if (value.veloId === veloId) {
      gps = value;
      break;
    }
  }

  return {
    status,
    login,
    gps
  }
}
