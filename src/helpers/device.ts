import { MessageParser, logger } from "shared-data";
import { InfluxDBService } from "../services/InfluxDBService";

export class Device extends MessageParser {
  private influxDBService: InfluxDBService;

  constructor(public imei: string, public veloId: string) {
    super(imei, veloId);
    this.influxDBService = new InfluxDBService();
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
  }

  protected handleParsedLogin(data: any): void {
    logger.debug(`||| Influxing Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data // Payload content
    );
  }

  protected handleParsedGps(data: any): void {
    logger.debug(`||| Influxing Data ||| \n${JSON.stringify(data)}`);
    this.influxDBService.writeToInflux(
      this.veloId,
      this.imei,
      this.getNanoseconds(),
      data // Payload content
    );
  }
}
