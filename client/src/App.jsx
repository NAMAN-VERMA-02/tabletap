import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/DashboardLayout';

// Pages load on demand, so a diner scanning a QR code doesn't download the dashboard or chart code.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Menu = lazy(() => import('./pages/Menu'));
const Tables = lazy(() => import('./pages/Tables'));
const QrSheet = lazy(() => import('./pages/QrSheet'));
const TableMenu = lazy(() => import('./pages/TableMenu'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Orders = lazy(() => import('./pages/Orders'));

const PageLoader = () => <div className="grid min-h-[50vh] place-items-center text-stone-500">Loading…</div>;

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
            <Route path="orders" element={<Orders />} />
          </Route>
          {/* Full-screen kitchen display (owner and staff) */}
          <Route path="/kitchen" element={<Kitchen />} />
        </Route>

        {/* Full-page print view, outside the dashboard chrome */}
        <Route element={<ProtectedRoute roles={['owner']} />}>
          <Route path="/print/qr-codes" element={<QrSheet />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
