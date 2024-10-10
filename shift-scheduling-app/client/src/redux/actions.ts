import { createAction } from '@reduxjs/toolkit';

export const setAvailability = createAction<Record<string, Record<string, number>>>('SET_AVAILABILITY');

