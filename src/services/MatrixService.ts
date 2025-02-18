import axios from "axios"
import { logger } from "shared-data"

export class MatrixService {
    private matrixHost: string;
    private matrixUser: string;
    private matrixPass: string;
    private matrixRoom: string;
    private accessToken: string | null = null;

    constructor() {
        this.matrixHost = process.env.MATRIX_HOST!;
        this.matrixUser = process.env.MATRIX_USER!;
        this.matrixPass = process.env.MATRIX_PASS!;
        this.matrixRoom = process.env.MATRIX_ROOM!;
    }

    // Log in to Matrix and get access token
    async login(): Promise<boolean> {
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
        } catch (error) {
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
}