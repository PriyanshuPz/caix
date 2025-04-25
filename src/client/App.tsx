import "./index.css";
import Sidebar from "./components/sidebar";
import { GlobalProvider } from "./contexts/use-global";
import MainContent from "./main/page";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalProvider>
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <MainContent />
        </div>
        <Toaster position="top-right" richColors closeButton />
      </GlobalProvider>
    </QueryClientProvider>
  );
}
