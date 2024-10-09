import { createReducer } from '@reduxjs/toolkit';
import { setAvailability } from './actions';

interface ScheduleState {
  availability: Record<string, Record<string, number>>;
}

const initialState: ScheduleState = {
  availability: {},
};

const rootReducer = createReducer(initialState, (builder) => {
  builder.addCase(setAvailability, (state, action) => {
    state.availability = action.payload;
  });
});

export default rootReducer;