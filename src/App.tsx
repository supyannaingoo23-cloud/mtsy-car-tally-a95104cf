import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import AuthGate from "./components/AuthGate";
import MonthlyBackupPrompt from "./components/MonthlyBackupPrompt";
import { MonthFilterProvider } from "./contexts/MonthFilterContext";
import FridayFuelPopup from "./components/FridayFuelPopup";
import Dashboard from "./pages/Dashboard";
import Daily from "./pages/Daily";
import Finance from "./pages/Finance";
import Maintenance from "./pages/Maintenance";
import Savings from "./pages/Savings";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate>
          <MonthFilterProvider>
            <MonthlyBackupPrompt />
            <FridayFuelPopup />
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/daily" element={<Daily />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MonthFilterProvider>
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
