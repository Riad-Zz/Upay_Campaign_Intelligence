// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignPage } from './pages/CampaignPage';
import { CustomersPage } from './pages/CustomersPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[#0b1120]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
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
