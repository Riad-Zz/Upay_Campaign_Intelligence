// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignPage } from './pages/CampaignPage';
import { CustomersPage } from './pages/CustomersPage';

export default function App() {
  return (
    <BrowserRouter>
      {/* Desktop: flex row with sidebar. Mobile: flex column with top nav bar */}
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          <Routes>
            <Route path="/"          element={<DashboardPage />} />
            <Route path="/campaign"  element={<CampaignPage />} />
            <Route path="/customers" element={<CustomersPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
