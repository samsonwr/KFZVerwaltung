import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import MaintenancePlans from './pages/MaintenancePlans'
import ServiceNew from './pages/ServiceNew'
import ServiceDetail from './pages/ServiceDetail'
import Planning from './pages/Planning'
import KmReport from './pages/KmReport'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/vehicles/:vehicleId" element={<VehicleDetail />} />
            <Route path="/vehicles/:vehicleId/plans" element={<MaintenancePlans />} />
            <Route path="/services/new" element={<ServiceNew />} />
            <Route path="/services/:serviceId" element={<ServiceDetail />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/km" element={<KmReport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
