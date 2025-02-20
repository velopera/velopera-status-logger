import { EventEmitter } from "events";
import { MessageParser, logger } from "shared-data";
import { InfluxDBService } from "../services/InfluxDBService";
import { MatrixService } from "../services/MatrixService";

export class Device extends MessageParser {
  private eventEmitter: EventEmitter;
  private influxDBService: InfluxDBService;
  private matrixService: MatrixService;

  constructor(public imei: string, public veloId: string) {
    super(imei, veloId);
    this.eventEmitter = new EventEmitter();
    this.influxDBService = new InfluxDBService();
    this.matrixService = new MatrixService();
  }

  private getNanoseconds(): number {
    return Date.now() * 1000000;
  }

  protected async handleParsedStatus(data: any): Promise<void> {
    logger.debug(`||| Influxing Status Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data
    );

    logger.debug(`||| Messaging Status to Matrix ||| \n${JSON.stringify(data)}`);
    const formattedData = `
      📡 [Status]
      📱 IMEI: ${this.imei}
      🚲️ VeloID: ${this.veloId}
      -------------------------
      ⚡ Battery Voltage: ${data.aku_voltage}V
      🧭 Accelerometer (X, Y, Z): (${data.comp_x}, ${data.comp_y}, ${data.comp_z})
      ⚙️ Gear: ${data.gear}
      💧 Humidity: ${data.humidity}%
      🚀 Speed: ${data.speed} km/h
      🌡️ Temperature: ${data.temperature}°C
    `.trim();
    await this.matrixService.sendMessage(formattedData);

    logger.debug(`||| Emitting Status Data Event ||| \n${JSON.stringify(data)}`);
    this.eventEmitter.emit("deviceStatus", data);
  }

  protected async handleParsedLogin(data: any): Promise<void> {
    logger.debug(`||| Influxing Login Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data
    );

    logger.debug(`||| Messaging Login to Matrix ||| \n${JSON.stringify(data)}`);
    const formattedData = `
      🔑 [Login]
      📱 IMEI: ${this.imei}
      🚲️ VeloID: ${this.veloId}
      -------------------------
      🌐 Network: ${data.networkStatus === "online" ? " 🟢 Online" : " 🔴 Offline"}
      📶 RSRP: ${data.rsrp}
      🌍 MCC: ${data.mcc}, MNC: ${data.mnc}
      🏢 CID: ${data.cid}, Area Code: ${data.areaCode}
      📡 Band: ${data.band}
      🖥️ Modem: ${data.modem}
      🔄 Firmware: ${data.fw}
      🆔 ICCID: ${data.iccid}
    `.trim();
    await this.matrixService.sendMessage(formattedData);

    logger.debug(`||| Emitting Login Data Event ||| \n${JSON.stringify(data)}`);
    this.eventEmitter.emit("deviceLogin", data);
  }

  protected async handleParsedGps(data: any): Promise<void> {
    logger.debug(`||| Influxing GPS Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data
    );

    logger.debug(`||| Messaging GPS to Matrix ||| \n${JSON.stringify(data)}`);
    const formattedData = `
      📍 [GPS]
      📱 IMEI: ${this.imei}
      🚲️ VeloID: ${this.veloId}
      -------------------------
      🌍 Location: ${data.latitude}, ${data.longitude}
      📏 Altitude: ${data.altitude}m
      🎯 Accuracy: ±${data.accuracy}m
      🚀 Speed: ${data.speed} km/h (±${data.speedAccuracy} km/h)
      🧭 Heading: ${data.heading}°
      📡 PDOP: ${data.pdop} | HDOP: ${data.hdop} | VDOP: ${data.vdop} | TDOP: ${data.tdop}
      🆔 Measurement ID: ${data.measId}
    `.trim();
    await this.matrixService.sendMessage(formattedData);

    logger.debug(`||| Emitting GPS Data Event ||| \n${JSON.stringify(data)}`);
    this.eventEmitter.emit("deviceGps", data);
  }

  // Method to allow external listeners to subscribe to events
  public on(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.on(event, listener);
    return this;
  }

  // Method to allow external listeners to unsubscribe from events
  public off(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.off(event, listener);
    return this;
  }
}
