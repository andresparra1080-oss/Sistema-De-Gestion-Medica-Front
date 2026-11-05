import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegistroPacientePage from './pages/RegistroPacientePage';
import InventarioPage from './pages/InventarioPage';
import TratamientosPage from './pages/TratamientosPage';
import NotFoundPage from './pages/NotFoundPage';
import LotesPage from './pages/LotesPage';
import EmergenciasPage from './pages/EmergenciasPage';
import EmergenciaDetallePage from './pages/EmergenciaDetallePage';
import ProtocoloPage from './pages/ProtocoloPage';
import AlertasPage from './pages/AlertasPage';
import HistoriaClinicaPage from './pages/HistoriaClinicaPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pacientes/registro" element={<RegistroPacientePage />} />
          <Route path="/pacientes/:id/historia" element={<HistoriaClinicaPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/lotes" element={<LotesPage />} />
          <Route path="/tratamientos" element={<TratamientosPage />} />
          <Route path="/emergencias" element={<EmergenciasPage />} />
          <Route path="/emergencias/protocolo/:tipo" element={<ProtocoloPage />} />
          <Route path="/emergencias/:id" element={<EmergenciaDetallePage />} />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;