import { logger } from "shared-data";
import { MQTTController } from "./controllers/MQTTController";
import { Database } from "./database/db";

export class Main {
  async run() {
    // Log the start of the main run
    logger.info("Main run...");

    try {
      // Fetch devices from the database
      const db = new Database();
      const devices = await db.getDevices();
      // Log the retrieved devices
      console.table(devices);
      logger.info(`Devices: ${[...devices]}`);

      // Initialize MQTTController with the retrieved devices
      new MQTTController(devices);
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
