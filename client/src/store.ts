import { configureStore } from "@reduxjs/toolkit";

// Import reducers
import PreferencesFeature from "./features/preferences";
import AuthFeature from "./features/auth";
import ConfigFeature from "./features/config";

export const store = configureStore({
  reducer: {
    preferences: PreferencesFeature.slice.reducer,
    auth: AuthFeature.slice.reducer,
    config: ConfigFeature.slice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
