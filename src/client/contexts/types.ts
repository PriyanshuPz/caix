export interface LoadingStateType {
  uploads: boolean;
  messages: boolean;
}

export interface DocumentType {
  id: string;
  name: string;
  size: number;
  type?: string;
  url?: string;
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

export interface GlobalContextType {
  uploadedDocuments: DocumentType[];
  addDocument: (doc: DocumentType) => void;
  removeDocument: (id: string) => void;

  messages: MessageType[];
  addMessage: (msg: MessageType) => void;

  sidebarState: SidebarStateType;
  toggleSidebar: () => void;

  loading: LoadingStateType;
  setLoading: (section: keyof LoadingStateType, value: boolean) => void;
}
