import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  DocumentType,
  MessageType,
  SidebarStateType,
  GlobalContextType,
  LoadingStateType,
  UserSessionType,
} from "./types";

// Generate a random user ID if none exists
const generateUserId = (): string => {
  return crypto.randomUUID();
};

// Local storage keys
const USER_SESSION_KEY = "caix_user_session";

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

  const [userSession, setUserSession] = useState<UserSessionType | null>(null);

  // Initialize user session from localStorage on component mount
  useEffect(() => {
    const loadUserSession = () => {
      try {
        const savedSession = localStorage.getItem(USER_SESSION_KEY);

        if (savedSession) {
          const parsedSession = JSON.parse(savedSession) as UserSessionType;
          setUserSession(parsedSession);
        } else {
          // Create new user session if none exists
          const newUserId = generateUserId();
          const newSession: UserSessionType = {
            userId: newUserId,
            createdAt: new Date().toISOString(),
          };

          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newSession));
          setUserSession(newSession);
        }
      } catch (error) {
        console.error("Error loading user session from localStorage:", error);
        // If there's an error, create a new session
        resetUserSession();
      }
    };

    loadUserSession();
  }, []);

  // === Handlers ===
  const setDocuments = (docs: DocumentType[]) => setUploadedDocuments(docs);

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

  // User session handlers
  const resetUserSession = () => {
    const newUserId = generateUserId();
    const newSession: UserSessionType = {
      userId: newUserId,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newSession));
    setUserSession(newSession);

    // Clear user-related data
    setUploadedDocuments([]);
    setMessages([]);
  };

  const updateUserSession = (updates: Partial<UserSessionType>) => {
    if (!userSession) return;

    const updatedSession = {
      ...userSession,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedSession));
    setUserSession(updatedSession);
  };

  // === Context Value ===
  const contextValue: GlobalContextType = {
    uploadedDocuments,
    addDocument,
    setDocuments,
    removeDocument,
    messages,
    addMessage,
    sidebarState,
    toggleSidebar,
    loading,
    setLoading,
    userSession,
    resetUserSession,
    updateUserSession,
    getCurrentUserId: () => userSession?.userId || null,
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
