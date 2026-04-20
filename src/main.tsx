import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import HomePage from './pages/HomePage'
import ItineraryPage from './pages/ItineraryPage'
import MapPage from './pages/MapPage'

import PageTransition from './components/PageTransition'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PageTransition>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/itinerary/:tripId" element={<ItineraryPage />} />
          <Route path="/map/:tripId" element={<MapPage />} />
        </Routes>
      </PageTransition>
    </BrowserRouter>
  </StrictMode>,
)
