import type { WritableDraft } from 'immer'

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import authApi from './api'

import type { ISessionAccount } from '../../../../shared/types/sessions'
import { AxiosError } from 'axios'

import * as AuthAPITypes from '../../../../shared/api/auth'

export interface AccountsState {
  account: ISessionAccount | null
  loading: boolean
  error: string | null
}

const initialState: AccountsState = {
  account: null,
  loading: false,
  error: null,
}

// Define thunks
export const login = createAsyncThunk(
  'accounts/login',
  async (data: AuthAPITypes.LoginRequestBody) => {
    const result = await authApi.login(data)
    return result
  },
)

export const logout = createAsyncThunk(
  'accounts/logout',
  async (_, thunkAPI) => {
    try {
      await authApi.logout()
    } catch (error: unknown) {
      if (!(error instanceof AxiosError)) {
        return thunkAPI.rejectWithValue('Unknown error')
      } else {
        return thunkAPI.rejectWithValue(
          error.response?.data.status || error.message,
        )
      }
    }
  },
)

export const fetch = createAsyncThunk('accounts/fetch', async (_, thunkAPI) => {
  try {
    return await authApi.fetch()
  } catch (error: unknown) {
    if (!(error instanceof AxiosError)) {
      return thunkAPI.rejectWithValue('Unknown error')
    } else {
      console.log(error)
      return thunkAPI.rejectWithValue(
        error.response?.data.status || error.message,
      )
    }
  }
})

export const register = createAsyncThunk(
  'accounts/register',
  async (data: AuthAPITypes.RegisterRequestBody, thunkAPI) => {
    try {
      return await authApi.register(data)
    } catch (error: unknown) {
      if (!(error instanceof AxiosError)) {
        return thunkAPI.rejectWithValue('Unknown error')
      } else {
        return thunkAPI.rejectWithValue(
          error.response?.data.status || error.message,
        )
      }
    }
  },
)

export const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setAccount: (state, action: PayloadAction<any>) => {
      state.account = action.payload as WritableDraft<any>
      state.loading = false
      state.error = null
    },
    clearAccount: (state) => {
      state.account = null
      state.loading = false
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.account = action.payload!
          .account! as WritableDraft<ISessionAccount>
        state.loading = false
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Logout cases
      .addCase(logout.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(logout.fulfilled, (state) => {
        state.account = null
        state.loading = false
        state.error = null
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch cases
      .addCase(fetch.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetch.fulfilled, (state, action) => {
        state.account = action.payload!
          .account! as WritableDraft<ISessionAccount>
        state.loading = false
        state.error = null
      })
      .addCase(fetch.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Register cases
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.account = action.payload!
          .account! as WritableDraft<ISessionAccount>
        state.loading = false
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export default accountsSlice
