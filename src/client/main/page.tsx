import { useGlobalContext } from "@client/contexts/use-global";
import { formatTime } from "@client/lib/utils";
import { Menu, Send } from "lucide-react";
import React, { useState } from "react";

export default function MainContent() {
  const { toggleSidebar, messages, loading, userSession } = useGlobalContext();

  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    console.log("Sending message:", inputMessage);
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-card px-4 py-3 border-b border-border">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => toggleSidebar()}
              className="p-1.5 mr-3 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors lg:hidden"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-xl font-bold text-primary">Chat</h1>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            {userSession ? (
              <span>{userSession.userId}</span>
            ) : (
              <span>Anonymous</span>
            )}
          </div>
        </div>
      </header>

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
                  {message.content}
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
        {loading.messages && (
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
            disabled={!inputMessage.trim() || loading.messages}
            className={`rounded-full w-10 h-10 flex items-center justify-center shadow-sm ${
              !inputMessage.trim() || loading.messages
                ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                : "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            }`}
          >
            <Send size={18} className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
