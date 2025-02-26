import { config } from "dotenv";
import { logger } from "shared-data";
import { MqttController } from "./controllers/MqttController";
import { Database } from "./database/db";

// Load environment variables from the .env file
config();

export class Main {
  async run() {
    logger.info("Main run...");

    try {
      // Initialize database and populate device cache
      const db = new Database();
      logger.debug("Populating device cache");
      const devices = await db.getDevices();
      console.table(devices);
      logger.info(`Devices: ${[...devices]}`);

      // Initialize MQTTController with the retrieved devices
      new MqttController(devices);
    } catch (error) {
      logger.error("Initialization error:", error);
    }
  }
}

const main = new Main();

main.run().catch((e: any) => {
  logger.error("ERROR::: Main.run() failed: ", e);
  logger.end();
  process.exit(1);
});
