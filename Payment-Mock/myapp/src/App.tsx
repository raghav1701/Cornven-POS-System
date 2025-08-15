// src/App.tsx

import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import OverdueList from "./pages/admin/OverdueList";
import RentalPayments from "./pages/admin/RentalPayments";
import MyBilling from "./pages/tenant/MyBilling";
import MyPayments from "./pages/tenant/MyPayments";

function Nav() {
  return (
    <nav className="nav">
      <a href="/admin/overdue">Admin: Overdue</a>
      <a href="/tenant/billing">Tenant: My Billing</a>
      <a href="/tenant/payments">Tenant: My Payments</a>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <div className="p-4 max-w-5xl mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/admin/overdue" />} />
          <Route path="/admin/overdue" element={<OverdueList />} />
          <Route path="/admin/rentals/:rentalId" element={<RentalPayments />} />
          <Route path="/tenant/billing" element={<MyBilling />} />
          <Route path="/tenant/payments" element={<MyPayments />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
