import { config } from "dotenv";
import { createPool, RowDataPacket } from "mysql2/promise";
import { Device } from "../helpers/device";

// Load environment variables from the .env file
config();

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

  // Method to fetch devices from the database
  async getDevices(): Promise<Map<string, Device>> {
    const connection = await this.pool.getConnection();
    try {
      // Execute a SQL query to retrieve device information
      const [rows] = await connection.query<RowDataPacket[]>(
        "SELECT imei, veloId FROM iot_device"
      );
      const deviceMap = new Map<string, Device>();
      // Create a map of devices from the query results
      rows.forEach((row) => {
        deviceMap.set(row.imei, new Device(row.imei, row.veloId));
      });
      return deviceMap;
    } finally {
      connection.release();
    }
  }
}
