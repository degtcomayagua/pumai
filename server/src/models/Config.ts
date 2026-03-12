import mongoose from "mongoose";

import { IConfig } from "../../../../contracts/pumai/models/config";
import metadataSchema from "./Metadata";

const configSchema = new mongoose.Schema<IConfig>({
  metadata: metadataSchema,
});

const ConfigModel = mongoose.model<IConfig>("Config", configSchema);

export default ConfigModel;
