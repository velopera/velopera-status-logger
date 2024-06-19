import { config } from "dotenv";
import { InfluxDB } from "influx";
import { logger } from "shared-data";

// Load environment variables from the .env file
config();

// InfluxDB service class for communication with InfluxDB
export class InfluxDBService {
  private influxDB: InfluxDB;

  constructor() {
    // Create a connection to InfluxDB using environment variables
    this.influxDB = new InfluxDB({
      host: process.env.INFLUXDB_HOST,
      port: parseInt(process.env.INFLUXDB_PORT!),
      database: process.env.INFLUXDB_NAME,
    });
  }

  // Write data to InfluxDB
  async writeToInflux(
    veloId: string,
    imei: string,
    timestamp: number,
    data: any
  ) {
    let pt = [];
    const point = {
      measurement: "velopera",
      tags: { veloId, imei },
      fields: {
        /*temperature: degree*/
      },
      timestamp: timestamp,
    };
    Object.assign(point.fields, data);
    pt.push(point);

    try {
      await this.influxDB.writePoints([point]);
      logger.info("Data written to InfluxDB", JSON.stringify(pt));
    } catch (error) {
      logger.warn("Error writing to InfluxDB", error);
    }
  }
}
