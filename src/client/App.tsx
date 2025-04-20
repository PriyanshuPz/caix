import { useState } from "react";
import { Send, X, Menu, Upload, File, Trash2 } from "lucide-react";
import "./index.css";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
};

type Document = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, newUserMessage]);
    setInputMessage("");
    setLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse: Message = {
        id: crypto.randomUUID(),
        text: "This is a sample response. In a real app, this would be from your AI responding to the user message and document context.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setLoading(false);
    }, 1000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const newDocuments: Document[] = Array.from(e.target.files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setDocuments([...documents, ...newDocuments]);
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar for document upload */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-card transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:w-80 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } border-r border-border`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary">Documents</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Upload area */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border/50">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer bg-secondary/60 hover:bg-secondary transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-primary" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or
                    drag
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PDF, TXT, DOCX, etc.
                  </p>
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Your Documents
            </h3>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/70">
                No documents uploaded yet
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-card/50 rounded-xl p-3 flex justify-between items-center border border-muted/80 hover:border-border/50 transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="bg-secondary rounded-lg p-2 mr-3 border border-border/30">
                      <File className="h-4 w-4 text-primary" />
                    </div>
                    <div className="truncate">
                      <div className="font-medium truncate text-sm">
                        {doc.name}
                      </div>
                      <div className="text-xs text-muted-foreground/70">
                        {formatFileSize(doc.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-full hover:bg-muted ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card px-4 py-3 border-b border-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 mr-3 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors lg:hidden"
              >
                <Menu size={18} />
              </button>
              <h1 className="text-xl font-bold text-primary">Document Chat</h1>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              {documents.length > 0 && (
                <div>
                  {documents.length} document{documents.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-center p-4">
              <div>
                <p className="text-xl mb-2 font-medium">
                  Welcome to Document Chat
                </p>
                <p className="text-sm">
                  Upload documents in the sidebar and start chatting
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-secondary text-secondary-foreground rounded-bl-none border border-border/50"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.text}
                  </div>
                  <div
                    className={`text-xs mt-1 text-right ${
                      message.sender === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl rounded-bl-none max-w-[80%] px-5 py-4 shadow-md border border-border/50">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse animation-delay-200"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse animation-delay-400"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-secondary border border-border rounded-full px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder-muted-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className={`rounded-full w-10 h-10 flex items-center justify-center shadow-sm ${
                !inputMessage.trim() || loading
                  ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              }`}
            >
              <Send size={18} className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
