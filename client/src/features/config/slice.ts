import type { WritableDraft } from 'immer'

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import configApi from './api'
import type { IConfig } from '../../../../shared/models/config'

export interface ConfigState {
  config: IConfig | null
  loading: boolean
  error: string | null
}

const initialState: ConfigState = {
  config: null,
  loading: false,
  error: null,
}

// Define thunks
export const fetchConfig = createAsyncThunk(
  'config/get',
  async (_, thunkAPI) => {
    const result = await configApi.get()

    if (result.status == 'success' && result.config) {
      return result.config
    } else {
      return thunkAPI.rejectWithValue(result.status)
    }
  },
)

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    getConfig: (state) => {
      return state
    },
    setConfig: (state, action: PayloadAction<IConfig | null>) => {
      state.config = action.payload as WritableDraft<IConfig> | null
    },
  },
  extraReducers: (builder) => {
    builder
      // Get cases
      .addCase(fetchConfig.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.config = action.payload as WritableDraft<IConfig> | null
        state.loading = false
        state.error = null
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export default configSlice
