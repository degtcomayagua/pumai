import mongoose, { ConnectOptions } from "mongoose";

import setupServer from "../setup.js";

class MongoDBClient {
  private readonly connectionString: string;
  private readonly options: ConnectOptions;
  private maxRetries: number = 5;
  private retryDelayMs: number = 3000;

  constructor(connectionString: string, options: ConnectOptions = {}) {
    this.connectionString = connectionString;
    this.options = options;
    this.bindEvents();
  }

  private bindEvents() {
    mongoose.connection.once("open", this.handleOpen);
    mongoose.connection.on("error", this.handleError);
    mongoose.connection.on("disconnected", this.handleDisconnect);
  }

  public async connect(): Promise<void> {
    mongoose.set("strictQuery", true);
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        await mongoose.connect(this.connectionString, this.options);
        return;
      } catch (err) {
        attempt++;
        console.error(
          `[MongoDB] Connection failed (Attempt ${attempt}/${this.maxRetries}):`,
          (err as Error).message,
        );
        if (attempt < this.maxRetries) {
          console.log(`[MongoDB] Retrying in ${this.retryDelayMs / 1000}s...`);
          await new Promise((res) => setTimeout(res, this.retryDelayMs));
        } else {
          console.error("[MongoDB] Max retries reached. Exiting.");
          process.exit(1);
        }
      }
    }
  }

  public getClient() {
    return mongoose.connection;
  }

  private handleOpen = () => {
    console.log("[MongoDB] Connected successfully");

    // Once we know that the database is connected, we can load the server setup check
    (async () => {
      await setupServer();
    })();
  };

  private handleError = (err: Error) => {
    console.error("[MongoDB] Error:", err.message);
  };

  private handleDisconnect = () => {
    console.warn("[MongoDB] Disconnected");
  };
}

export default MongoDBClient;
