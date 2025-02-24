import { MatrixClient, MatrixEvent, RoomMemberEvent, MemoryStore } from "matrix-js-sdk";
import { logger } from "shared-data";

type MessageType = "status" | "login" | "gps";

type MatrixConfig = {
    host: string;
    user: string;
    pass: string;
    room: string;
};

export class MatrixService {
    private client: MatrixClient;
    private config: MatrixConfig;

    constructor() {
        this.config = {
            host: process.env.MATRIX_HOST!,
            user: process.env.MATRIX_USER!,
            pass: process.env.MATRIX_PASS!,
            room: process.env.MATRIX_ROOM!,
        };

        this.client = new MatrixClient({
            baseUrl: this.config.host,
            accessToken: "",
            userId: this.config.user,
            store: new MemoryStore(),
        });

        this.client.on(RoomMemberEvent.Membership, async (event: MatrixEvent, member) => {
            if (member.membership === "invite" && member.userId === this.config.user) {
                const roomId = event.getRoomId();
                if (roomId) {
                    await this.client.joinRoom(roomId);
                    logger.info(`Joined room: ${roomId}`);
                }
            }
        });
    }

    async login(): Promise<boolean> {
        try {
            const response = await this.client.loginRequest({
                type: "m.login.password",
                identifier: { type: "m.id.user", user: this.config.user },
                password: this.config.pass,
            });

            this.client = new MatrixClient({
                baseUrl: this.config.host,
                accessToken: response.access_token,
                userId: response.user_id,
                store: new MemoryStore(),
            });

            await this.client.startClient();
            logger.info("Matrix login successful");
            return true;
        } catch (error) {
            logger.error("Matrix login failed", error);
            return false;
        }
    }

    async sendMessage(message: string): Promise<boolean> {
        try {
            if (!this.client.getAccessToken()) {
                logger.warn("No Matrix access token, attempting login...");
                const loggedIn = await this.login();
                if (!loggedIn) return false;
            }

            await this.client.sendTextMessage(this.config.room, message);
            logger.info("Matrix message sent successfully");
            return true;
        } catch (error) {
            logger.error("Matrix message send failed: ", error);
            return false;
        }
    }

    async formatAndSendMessage(type: MessageType, imei: string, veloId: string, data: any): Promise<boolean> {
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
        return this.sendMessage(formattedData);
    }
}
