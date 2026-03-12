import api from "./api";
import slice, { fetchConfig } from "./slice";

import * as ConfigAPITypes from "../../../../shared/api/config";
import type { IConfig } from "../../../../shared/models/config";

import * as schemas from "../../../../shared/schemas/config";

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
