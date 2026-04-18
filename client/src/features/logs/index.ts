import logsAPI from './api'

import * as LogAPITypes from '../../../../shared/models/log'
import type { ILog } from '../../../../shared/models/log'

import * as schemas from '../../../../shared/schemas/logs'

export type { ILog, LogAPITypes }
export default { logsAPI, schemas }
