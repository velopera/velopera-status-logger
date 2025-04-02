import { createPool, RowDataPacket } from "mysql2/promise";
import { logger } from "shared-data";
import { Device } from "../helpers/device";

// Database class that handles MySQL interactions
export class Database {
  private pool;

  constructor() {
    // Create a connection pool using environment variables
    this.pool = createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: 3306,
      connectTimeout: 60,
    });
  }

  // Fetch and return a map of devices from the database
  async getDevices(): Promise<Map<string, Device>> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        "SELECT imei, veloId FROM iot_device"
      );
      const deviceMap = new Map<string, Device>();
      rows.forEach((row) => {
        deviceMap.set(row.imei, new Device(row.imei, row.veloId));
      });
      return deviceMap;
    } catch (error) {
      logger.error("Database error:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
}
