import api from "./api";
import slice, { fetchConfig } from "./slice";

import * as ConfigAPITypes from "../../../../../contracts/pumai/api/config";
import type { IConfig } from "../../../../../contracts/pumai/models/config";

import * as schemas from "../../../../../contracts/pumai/schemas/config";

const objectToExport = {
  api,
  slice,
  actions: {
    fetchConfig,
  },
  schemas,
  hooks: {},
  components: {},
};

export type { IConfig, ConfigAPITypes };
export default objectToExport;
