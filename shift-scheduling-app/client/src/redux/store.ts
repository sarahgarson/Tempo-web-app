import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers';

const store = configureStore({
  reducer: rootReducer,
});

const availabilityReducer = (state = {}, action: any) => {
  switch (action.type) {
    case 'SET_AVAILABILITY':
      console.log('Setting availability in store:', action.payload);
      return action.payload;
    default:
      return state;
  }
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;