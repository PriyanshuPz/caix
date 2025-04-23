import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type {
  DocumentType,
  MessageType,
  SidebarStateType,
  GlobalContextType,
  LoadingStateType,
} from "./types";

// Context
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Provider
export const GlobalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // === State ===
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentType[]>(
    []
  );
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [sidebarState, setSidebarState] = useState<SidebarStateType>({
    isOpen: false,
  });
  const [loading, setLoadingState] = useState<LoadingStateType>({
    uploads: false,
    messages: false,
  });

  // === Handlers ===
  const addDocument = (doc: DocumentType) =>
    setUploadedDocuments((prev) => [...prev, doc]);

  const removeDocument = (id: string) =>
    setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== id));

  const addMessage = (msg: MessageType) =>
    setMessages((prev) => [...prev, msg]);

  const toggleSidebar = () =>
    setSidebarState((prev) => ({ ...prev, isOpen: !prev.isOpen }));

  const setLoading = (section: keyof LoadingStateType, value: boolean) =>
    setLoadingState((prev) => ({ ...prev, [section]: value }));

  // === Context Value ===
  const contextValue: GlobalContextType = {
    uploadedDocuments,
    addDocument,
    removeDocument,
    messages,
    addMessage,
    sidebarState,
    toggleSidebar,
    loading,
    setLoading,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

// Hook
export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};
