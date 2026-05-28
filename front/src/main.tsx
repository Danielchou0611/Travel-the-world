import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './App.css'
import HomePage from './pages/HomePage'
import ItineraryPage from './pages/ItineraryPage'
import MapPage from './pages/MapPage'
import { TripProvider } from './contexts/TripContext'

import PageTransition from './components/PageTransition'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TripProvider>
        <PageTransition>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/itinerary/:tripId" element={<ItineraryPage />} />
            <Route path="/map/:tripId" element={<MapPage />} />
          </Routes>
        </PageTransition>
      </TripProvider>
    </BrowserRouter>
  </StrictMode>,
)
