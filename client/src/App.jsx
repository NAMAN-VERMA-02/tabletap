import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Tables from './pages/Tables';
import QrSheet from './pages/QrSheet';
import TableMenu from './pages/TableMenu';
import OrderStatus from './pages/OrderStatus';
import DashboardLayout from './components/DashboardLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Diner pages (no login) */}
      <Route path="/t/:qrToken" element={<TableMenu />} />
      <Route path="/order/:trackingToken" element={<OrderStatus />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="menu" element={<Menu />} />
          <Route path="tables" element={<Tables />} />
        </Route>
      </Route>

      {/* Full-page print view, outside the dashboard chrome */}
      <Route element={<ProtectedRoute roles={['owner']} />}>
        <Route path="/print/qr-codes" element={<QrSheet />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
