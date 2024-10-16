import { createReducer } from '@reduxjs/toolkit';
import { setAvailability } from './actions';

const initialState: ScheduleState = {
  availability: {},
};


interface ScheduleState {
  availability: Record<string, Record<string, number>>;
}


// const rootReducer = createReducer(initialState, (builder) => {
//   builder.addCase(setAvailability, (state, action) => {
//     state.availability = JSON.parse(JSON.stringify(action.payload));
//   });
// });

const rootReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setAvailability, (state, action) => {
      state.availability = action.payload;
    });
});

export default rootReducer;
