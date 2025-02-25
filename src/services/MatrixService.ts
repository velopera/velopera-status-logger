import axios from "axios";
import { logger } from "shared-data";
import { getDeviceInfoById } from "../controllers/MqttController";

export class MatrixService {
    private matrixHost: string;
    private matrixUser: string;
    private matrixPass: string;
    private matrixRoom: string;
    private accessToken: string | null = null;
    private syncTimeout: number = 30000; // 30 seconds
    private since: string | null = null;

    constructor() {
        this.matrixHost = process.env.MATRIX_HOST!;
        this.matrixUser = process.env.MATRIX_USER!;
        this.matrixPass = process.env.MATRIX_PASS!;
        this.matrixRoom = process.env.MATRIX_ROOM!;
    }

    // Log in to Matrix and get access token
    async login(retryCount = 0): Promise<boolean> {
        const MAX_RETRIES = 5;

        if (retryCount >= MAX_RETRIES) {
            logger.error("Matrix login failed after multiple attempts.");
            return false;
        }

        try {
            const response = await axios.post(`${this.matrixHost}/_matrix/client/v3/login`,
                {
                    type: "m.login.password",
                    identifier: {
                        type: "m.id.user",
                        user: this.matrixUser,
                    },
                    password: this.matrixPass,
                });

            this.accessToken = response.data.access_token;
            logger.info("Matrix login successful");
            return true;
        } catch (error: any) {
            if (error.response && error.response.status === 429) {
                const retryAfter = Number(error.response.headers['retry-after']) || 5;
                logger.warn(`Rate limited, retrying after ${retryAfter} seconds (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.login(retryCount + 1);
            }

            logger.error("Matrix login failed", error);
            return false;
        }
    }

    // Send message to Matrix room
    async sendMessage(message: string): Promise<boolean> {
        if (!this.accessToken) {
            logger.warn("No Matrix access token, attempting login...");
            const loggedIn = await this.login();
            if (!loggedIn) return false;
        }

        try {
            // Generate unique txnId for each message
            const txnId = new Date().getTime();
            await axios.put(`${this.matrixHost}/_matrix/client/v3/rooms/${encodeURIComponent(this.matrixRoom)}/send/m.room.message/${txnId}`,
                {
                    msgtype: "m.text",
                    body: message,
                },
                {
                    headers: { Authorization: `Bearer ${this.accessToken}` },
                }
            );
            logger.info("Matrix message sent successfully");
            return true;
        } catch (error) {
            logger.error("Matrix message sent failed: ", error);
            return false;
        }
    }

    // Listen for messages in the Matrix room
    async listenForMessages() {
        if (!this.accessToken) {
            logger.warn("No Matrix access token, attempting login...");
            const loggedIn = await this.login();
            if (!loggedIn) return;
        }

        try {
            while (true) {
                const response = await axios.get(`${this.matrixHost}/_matrix/client/v3/sync`, {
                    params: {
                        timeout: this.syncTimeout,
                        since: this.since,
                    },
                    headers: { Authorization: `Bearer ${this.accessToken}` },
                });

                this.since = response.data.next_batch;

                const roomEvents = response.data.rooms?.join?.[this.matrixRoom]?.timeline?.events || [];
                for (const event of roomEvents) {
                    if (event.type === 'm.room.message' && event.sender !== this.matrixUser) {
                        logger.debug(`Received message: ${event.content.body}`);
                        await this.handleCommand(event.content.body);
                    } else if (event.type === 'm.room.encrypted') {
                        logger.debug(`Received encrypted message from ${event.sender}. Attempting decryption.`);
                        await this.decryptMessage(event);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, this.syncTimeout));
            }
        } catch (error) {
            logger.error("Error listening for Matrix messages: ", error);
        }
    }

    private async decryptMessage(event: any) {
        if (!this.accessToken) return;
        try {
            // Log the encrypted event
            logger.debug("Encrypted event received:", JSON.stringify(event, null, 2));

            // Query device keys
            const response = await axios.post(`${this.matrixHost}/_matrix/client/v3/keys/query`, {
                device_keys: { [event.sender]: [] },
            }, {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            });
            logger.debug("Keys query response:", JSON.stringify(response.data, null, 2));

            const deviceKeys = response.data.device_keys?.[event.sender];
            if (!deviceKeys) {
                logger.error(`No device keys found for sender ${event.sender}. Cannot decrypt.`);
                return;
            }

            // Claim one-time keys
            const decryptedResponse = await axios.post(`${this.matrixHost}/_matrix/client/v3/keys/claim`, {
                one_time_keys: { [event.sender]: { [deviceKeys.device_id]: "signed_curve25519" } },
            }, {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            });
            logger.debug("Keys claim response:", JSON.stringify(decryptedResponse.data, null, 2));

            // Log the full decrypted response
            logger.debug("Decrypted response:", JSON.stringify(decryptedResponse.data, null, 2));

            // Extract decrypted message
            const decryptedMessage = decryptedResponse.data.event?.content?.body || decryptedResponse.data.cleartext?.body;
            if (!decryptedMessage) {
                logger.error("Decryption successful, but message body is empty. Full response:", JSON.stringify(decryptedResponse.data, null, 2));
                return;
            }

            logger.info(`Decrypted message: ${decryptedMessage}`);
            await this.handleCommand(decryptedMessage);

        } catch (error) {
            logger.error("Error while decrypting message: ", error);
        }
    }

    // Handle commands from the Matrix room
    private async handleCommand(message: string) {
        const botUsernames = ["@matrix-logger", "matrix-logger", "@matrix-logger:matrix.voxel.at"];

        if (!botUsernames.some(name => message.includes(name))) {
            logger.debug(`Ignoring message not directed at the bot: ${message}`);
            return;
        }

        const commandBody = message.replace(/@matrix-logger|matrix-logger:|matrix-logger/g, "").trim().replace(/\s+/g, " ");
        const [deviceId, command] = commandBody.split(' ');

        if (!deviceId || !command) {
            logger.warn(`Invalid command format: ${message}`);
            return;
        }

        logger.debug(`Processing command: deviceId=${deviceId}, command=${command}`);

        const deviceInfo = getDeviceInfoById(deviceId);

        if (!deviceInfo) {
            logger.warn(`Device not found: ${deviceId}`);
            await this.sendMessage(`Device ${deviceId} not found.`);
            return;
        }

        switch (command.toLowerCase()) {
            case 'status':
                if (deviceInfo.status) {
                    await this.formatAndSendMessage('status', deviceInfo.status.imei, deviceInfo.status.veloId, deviceInfo.status.statusData);
                } else {
                    await this.sendMessage(`No status data available for device ${deviceId}.`);
                }
                break;

            case 'login':
                if (deviceInfo.login) {
                    await this.formatAndSendMessage('login', deviceInfo.login.imei, deviceInfo.login.veloId, deviceInfo.login.loginData);
                } else {
                    await this.sendMessage(`No login data available for device ${deviceId}.`);
                }
                break;

            case 'gps':
                if (deviceInfo.gps) {
                    await this.formatAndSendMessage('gps', deviceInfo.gps.imei, deviceInfo.gps.veloId, deviceInfo.gps.gpsData);
                } else {
                    await this.sendMessage(`No GPS data available for device ${deviceId}.`);
                }
                break;

            default:
                logger.warn(`Unknown command: ${command}`);
                await this.sendMessage(`Unknown command: ${command}. Available commands: status, login, gps.`);
                break;
        }
    }

    async formatAndSendMessage(type: string, imei: string, veloId: string, data: any): Promise<boolean> {
        let formattedData = "";

        switch (type) {
            case "status":
                formattedData = `
                    📡 [Status]
                    📱 IMEI: ${imei}
                    🚲️ VeloID: ${veloId}
                    -------------------------
                    ⚡  Battery Voltage: ${data.aku_voltage}V
                    🧭 Accelerometer (X, Y, Z): (${data.comp_x}, ${data.comp_y}, ${data.comp_z})
                    ⚙️  Gear: ${data.gear}
                    💧 Humidity: ${data.humidity}%
                    🚀 Speed: ${data.speed} km/h
                    🌡️ Temperature: ${data.temperature}°C
                `.trim();
                break;

            case "login":
                formattedData = `
                    🔑 [Login]
                    📱 IMEI: ${imei}
                    🚲️ VeloID: ${veloId}
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
                break;

            case "gps":
                formattedData = `
                    📍 [GPS]
                    📱 IMEI: ${imei}
                    🚲️ VeloID: ${veloId}
                    -------------------------
                    🌍 Location: ${data.latitude}, ${data.longitude}
                    📏 Altitude: ${data.altitude}m
                    🎯 Accuracy: ±${data.accuracy}m
                    🚀 Speed: ${data.speed} km/h (±${data.speedAccuracy} km/h)
                    🧭 Heading: ${data.heading}°
                    📡 PDOP: ${data.pdop} | HDOP: ${data.hdop} | VDOP: ${data.vdop} | TDOP: ${data.tdop}
                    🆔 Measurement ID: ${data.measId}
                `.trim();
                break;

            default:
                logger.warn(`Unknown message type: ${type}`);
                return false;
        }

        logger.debug(`Sending formatted message: ${formattedData}`);
        return this.sendMessage(formattedData);
    }
}