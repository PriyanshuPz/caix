export interface LoadingStateType {
  uploads: boolean;
  messages: boolean;
}

export interface DocumentType {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "processed" | "error" | "deleted";
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
  chunkCount?: number;
}

export interface MessageType {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

export interface SidebarStateType {
  isOpen: boolean;
}

export interface UserSessionType {
  userId: string;
  createdAt: string;
  updatedAt?: string;
  name?: string;
  email?: string;
  preferences?: {
    theme?: "light" | "dark" | "system";
    fontSize?: "small" | "medium" | "large";
    [key: string]: any;
  };
}

export interface GlobalContextType {
  uploadedDocuments: DocumentType[];
  addDocument: (doc: DocumentType) => void;
  removeDocument: (id: string) => void;
  setDocuments: (docs: DocumentType[]) => void;

  messages: MessageType[];
  addMessage: (msg: MessageType) => void;

  sidebarState: SidebarStateType;
  toggleSidebar: () => void;

  loading: LoadingStateType;
  setLoading: (section: keyof LoadingStateType, value: boolean) => void;

  // New user session properties
  userSession: UserSessionType | null;
  resetUserSession: () => void;
  updateUserSession: (updates: Partial<UserSessionType>) => void;
  getCurrentUserId: () => string | null;
}
