import { create } from "zustand";
import type { TripPlanResponse } from "../types/api";

interface TripStoreState {
  lastPlannedTrip: TripPlanResponse | null;
  setLastPlannedTrip: (trip: TripPlanResponse | null) => void;
}

export const useTripStore = create<TripStoreState>((set) => ({
  lastPlannedTrip: null,
  setLastPlannedTrip: (trip) => set({ lastPlannedTrip: trip }),
}));
