import "./index.css";
import Sidebar from "./components/sidebar";
import { GlobalProvider } from "./contexts/use-global";
import MainContent from "./main/page";

export default function App() {
  return (
    <GlobalProvider>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar />
        <MainContent />
      </div>
    </GlobalProvider>
  );
}
