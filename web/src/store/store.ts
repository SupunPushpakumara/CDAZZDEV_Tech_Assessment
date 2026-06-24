import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import { teamsyncApi } from './services/teamsyncApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [teamsyncApi.reducerPath]: teamsyncApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(teamsyncApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
