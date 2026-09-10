import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { formatBotMessage } from "../utils/password";

export default function ChatPanel({ onAction }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi — I'm TriCipher, your adversarial coach. Type **hi** to start, or paste a password to analyze.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [chatState, setChatState] = useState({});
  const [ollamaLabel, setOllamaLabel] = useState("Checking…");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!user) return;
    api.chatStatus()
      .then((data) => {
        if (data.available) setOllamaLabel(`Ollama · ${data.model}`);
        else if (data.enabled) setOllamaLabel("Demo mode");
        else setOllamaLabel("Built-in");
      })
      .catch(() => setOllamaLabel("Offline"));
  }, [user]);

  const send = async () => {
    const message = input.trim();
    if (!message || !user) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setTyping(true);
    try {
      const data = await api.chat(message, chatState);
      setChatState(data.state || {});
      setMessages((m) => [...m, { role: "bot", text: data.reply }]);
      onAction?.(data.actions);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Session expired — please log in again." }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <section className={`panel panel-chat ${!user ? "locked" : ""}`}>
      <header className="panel-head">
        <div>
          <span className="eyebrow">AI Coach</span>
          <h2>TriCipher Coach</h2>
        </div>
        <span className="status-pill">{ollamaLabel}</span>
      </header>

      {!user && (
        <div className="lock-screen">
          <p>Login to chat with TriCipher</p>
        </div>
      )}

      <div className="chat-feed">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble bubble-${msg.role}`}>
            {msg.role === "bot" ? (
              <div dangerouslySetInnerHTML={{ __html: formatBotMessage(msg.text) }} />
            ) : (
              msg.text
            )}
          </div>
        ))}
        {typing && <div className="bubble bubble-bot typing">TriCipher is thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={user ? "Type a message…" : "Login required"}
          disabled={!user}
        />
        <button type="button" className="btn btn-primary" onClick={send} disabled={!user}>
          Send
        </button>
      </div>
    </section>
  );
}
