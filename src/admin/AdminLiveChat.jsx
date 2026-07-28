import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Headset, MessageSquare, Send, CheckCircle2, Archive, User, Circle } from 'lucide-react';
import './AdminLiveChat.css';

export default function AdminLiveChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [adminInput, setAdminInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch all active conversations
  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (!error && data) {
        setConversations(data);
      }
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (convId) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime listener for NEW conversations and NEW messages
  useEffect(() => {
    // 1. Listen for new conversations or updates
    const convChannel = supabase
      .channel('admin_chat_conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        (payload) => {
          fetchConversations();
        }
      )
      .subscribe();

    // 2. Listen for new messages globally
    const msgChannel = supabase
      .channel('admin_chat_messages_global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new;
          
          // Play notification sound for incoming user messages
          if (newMsg.sender === 'user') {
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(() => {});
            } catch (e) {}
          }

          // If current open conversation matches
          if (selectedConv && selectedConv.id === newMsg.conversation_id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [selectedConv]);

  // Admin send message
  const handleSendAdminMessage = async (e) => {
    e.preventDefault();
    if (!adminInput.trim() || !selectedConv) return;

    const textToSend = adminInput.trim();
    setAdminInput('');

    try {
      const tempId = 'temp_' + Date.now();
      const newMsgObj = {
        id: tempId,
        conversation_id: selectedConv.id,
        sender: 'admin',
        message: textToSend,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, newMsgObj]);

      const { data: insertedMsg, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConv.id,
          sender: 'admin',
          message: textToSend
        })
        .select()
        .single();

      if (!error && insertedMsg) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? insertedMsg : m)));
        await supabase
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', selectedConv.id);
      }
    } catch (err) {
      console.error("Admin send message error:", err);
    }
  };

  // Close / Archive conversation
  const handleCloseConversation = async (convId) => {
    if (!window.confirm("Bu söhbəti tamamlamaq və arxivləşdirmək istədiyinizə əminsiniz?")) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status: 'closed' })
        .eq('id', convId);

      if (error) throw error;
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, status: 'closed' } : c)));
      if (selectedConv?.id === convId) {
        setSelectedConv((prev) => ({ ...prev, status: 'closed' }));
      }
    } catch (err) {
      alert("Xəta: " + err.message);
    }
  };

  return (
    <div className="admin-chat-container">
      {/* Sidebar: Conversation List */}
      <div className="admin-chat-sidebar">
        <div className="sidebar-chat-header">
          <Headset size={20} />
          <h4>Canlı Söhbətlər ({conversations.length})</h4>
        </div>

        {loading ? (
          <p className="admin-chat-loading">Yüklənir...</p>
        ) : conversations.length === 0 ? (
          <p className="admin-chat-empty">Hələ heç bir dəstək müraciəti yoxdur.</p>
        ) : (
          <div className="conversations-list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item ${selectedConv?.id === conv.id ? 'active' : ''} ${conv.status}`}
                onClick={() => setSelectedConv(conv)}
              >
                <div className="conv-user-icon">
                  <User size={18} />
                </div>
                <div className="conv-info">
                  <div className="conv-top">
                    <strong>{conv.guest_name || 'Qonaq İstifadəçi'}</strong>
                    <span className="conv-time">
                      {new Date(conv.last_message_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`conv-status-badge ${conv.status}`}>
                    {conv.status === 'active' ? 'Aktiv Söhbət' : 'Bağlanıb'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Area: Chat Window */}
      <div className="admin-chat-main">
        {selectedConv ? (
          <>
            <div className="admin-chat-topbar">
              <div className="topbar-user">
                <User size={20} />
                <div>
                  <h4>{selectedConv.guest_name || 'Qonaq İstifadəçi'}</h4>
                  <p className="user-id-sub">Session ID: {selectedConv.guest_identifier.substring(0, 16)}...</p>
                </div>
              </div>

              {selectedConv.status === 'active' && (
                <button
                  className="close-conv-btn"
                  onClick={() => handleCloseConversation(selectedConv.id)}
                  title="Söhbəti bağla"
                >
                  <Archive size={16} />
                  <span>Söhbəti Bağla</span>
                </button>
              )}
            </div>

            <div className="admin-chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`admin-msg-bubble ${msg.sender === 'admin' ? 'admin' : 'user'}`}>
                  <p>{msg.message}</p>
                  <span className="admin-msg-time">
                    {new Date(msg.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {selectedConv.status === 'active' ? (
              <form className="admin-chat-input-area" onSubmit={handleSendAdminMessage}>
                <input
                  type="text"
                  placeholder="İstifadəçiyə cavab yazın..."
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  required
                />
                <button type="submit" className="admin-chat-send-btn">
                  <Send size={18} />
                  <span>Göndər</span>
                </button>
              </form>
            ) : (
              <div className="closed-chat-bar">
                <p>Bu söhbət tamamlanıb və arxivləşdirilib.</p>
              </div>
            )}
          </>
        ) : (
          <div className="no-conv-selected">
            <MessageSquare size={48} />
            <p>Cavab yazmaq üçün sol tərəfdən bir söhbət seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
