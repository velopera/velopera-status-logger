import { MessageParser, logger } from "shared-data";
import { InfluxDBService } from "../services/InfluxDBService";
import { MatrixService } from "../services/MatrixService";

export class Device extends MessageParser {
  private influxDBService: InfluxDBService;
  private matrixService: MatrixService;

  constructor(public imei: string, public veloId: string) {
    super(imei, veloId);
    this.influxDBService = new InfluxDBService();
    this.matrixService = new MatrixService();
  }

  private getNanoseconds(): number {
    return Date.now() * 1000000;
  }

  protected handleParsedStatus(data: any): void {
    logger.debug(`||| Influxing Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data // Payload content
    );

    const message = `📡 [Status] IMEI: ${this.imei}, VeloID: ${this.veloId}, Data: ${JSON.stringify(data)}`;
    this.matrixService.sendMessage(message);
  }

  protected handleParsedLogin(data: any): void {
    logger.debug(`||| Influxing Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data // Payload content
    );

    logger.debug(`||| Messaging to Matrix ||| \n${JSON.stringify(data)}`);
    const message = `🔑 [Login] IMEI: ${this.imei}, VeloID: ${this.veloId}, Data: ${JSON.stringify(data)}`;
    this.matrixService.sendMessage(message);
  }

  protected handleParsedGps(data: any): void {
    logger.debug(`||| Influxing Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data // Payload content
    );

    logger.debug(`||| Messaging to Matrix ||| \n${JSON.stringify(data)}`);
    const message = `📍 [GPS] IMEI: ${this.imei}, VeloID: ${this.veloId}, Data: ${JSON.stringify(data)}`;
    this.matrixService.sendMessage(message);
  }
}
