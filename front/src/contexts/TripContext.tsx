import React, { createContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Trip } from '../types';
import { MOCK_TRIP } from '../services/api';

type TripContextType = {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
};

export const TripContext = createContext<TripContextType>({
  trip: MOCK_TRIP,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setTrip: () => {},
});

export function TripProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [trip, setTrip] = useState<Trip>(MOCK_TRIP);

  // Hydrate trip from navigation state when available
  useEffect(() => {
    try {
      const state = location.state as Record<string, any> | null;
      if (state && state.trip) {
        setTrip(state.trip as Trip);
      }
    } catch (e) {
      // ignore
    }
  }, [location]);

  return (
    <TripContext.Provider value={{ trip, setTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export default TripContext;
