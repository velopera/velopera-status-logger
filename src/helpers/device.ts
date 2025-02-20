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
    this.influxDBService.writeToInflux(this.veloId, this.imei, this.getNanoseconds(), data);

    logger.debug(`||| Messaging Status to Matrix ||| \n${JSON.stringify(data)}`);
    await this.matrixService.formatAndSendMessage("status", this.imei, this.veloId, data);

    logger.debug(`||| Emitting Status Data Event ||| \n${JSON.stringify(data)}`);
    this.eventEmitter.emit("deviceStatus", data);
  }

  protected async handleParsedLogin(data: any): Promise<void> {
    logger.debug(`||| Influxing Login Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(this.veloId, this.imei, this.getNanoseconds(), data);

    logger.debug(`||| Messaging Login to Matrix ||| \n${JSON.stringify(data)}`);
    await this.matrixService.formatAndSendMessage("login", this.imei, this.veloId, data);

    logger.debug(`||| Emitting Login Data Event ||| \n${JSON.stringify(data)}`);
    this.eventEmitter.emit("deviceLogin", data);
  }

  protected async handleParsedGps(data: any): Promise<void> {
    logger.debug(`||| Influxing GPS Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(this.veloId, this.imei, this.getNanoseconds(), data);

    logger.debug(`||| Messaging GPS to Matrix ||| \n${JSON.stringify(data)}`);
    await this.matrixService.formatAndSendMessage("gps", this.imei, this.veloId, data);

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
