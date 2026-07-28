import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquare, X, Send, User, Headset, Circle } from 'lucide-react';
import './LiveChatWidget.css';

export default function LiveChatWidget({ session }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [conversation, setConversation] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Get or generate guest identifier stored in localStorage
  const getGuestIdentifier = () => {
    let id = localStorage.getItem('guest_chat_id');
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('guest_chat_id', id);
    }
    return id;
  };

  const guestIdentifier = getGuestIdentifier();

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Load or create active conversation
  useEffect(() => {
    async function initConversation() {
      try {
        let query = supabase.from('chat_conversations').select('*').eq('status', 'active');
        if (session?.user?.id) {
          query = query.eq('user_id', session.user.id);
        } else {
          query = query.eq('guest_identifier', guestIdentifier);
        }

        const { data: convData, error } = await query.order('created_at', { ascending: false }).limit(1);

        if (convData && convData.length > 0) {
          setConversation(convData[0]);
          fetchMessages(convData[0].id);
        }
      } catch (err) {
        console.error("Chat init error:", err);
      }
    }

    initConversation();
  }, [session]);

  // Fetch messages for active conversation
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
      console.error("Fetch chat messages error:", err);
    }
  };

  // ADDIMS 4: Supabase Realtime Subscription for incoming admin messages
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`chat_messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.sender === 'admin' && !isOpen) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, isOpen]);

  // Send new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      let currentConv = conversation;

      // Create new conversation if none exists
      if (!currentConv) {
        const payload = {
          guest_identifier: guestIdentifier,
          guest_name: session?.user?.user_metadata?.full_name || guestName || 'İstifadəçi',
          user_id: session?.user?.id || null,
          status: 'active'
        };

        const { data: newConv, error: convErr } = await supabase
          .from('chat_conversations')
          .insert(payload)
          .select()
          .single();

        if (convErr) throw convErr;
        currentConv = newConv;
        setConversation(newConv);
      }

      // Optimistic message update
      const tempId = 'temp_' + Date.now();
      const newMsgObj = {
        id: tempId,
        conversation_id: currentConv.id,
        sender: 'user',
        message: textToSend,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, newMsgObj]);

      // Insert message into database
      const { data: insertedMsg, error: msgErr } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConv.id,
          sender: 'user',
          message: textToSend
        })
        .select()
        .single();

      if (!msgErr && insertedMsg) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? insertedMsg : m)));
        // Update conversation last_message_at timestamp
        await supabase
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', currentConv.id);
      }
    } catch (err) {
      console.error("Message send error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="live-chat-widget">
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button className="chat-floating-btn" onClick={() => setIsOpen(true)} title="Canlı Dəstək">
          <Headset size={26} />
          <span>Canlı Dəstək</span>
          {unreadCount > 0 && <span className="chat-unread-badge">{unreadCount}</span>}
        </button>
      )}

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div className="chat-window-box">
          {/* Header */}
          <div className="chat-window-header">
            <div className="chat-header-info">
              <Headset size={20} />
              <div>
                <h4>Canlı Dəstək</h4>
                <p className="online-status"><Circle size={8} fill="#10b981" color="#10b981" /> Operator onlayndır</p>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>&times;</button>
          </div>

          {/* Messages Body */}
          <div className="chat-window-body">
            {messages.length === 0 ? (
              <div className="chat-welcome-msg">
                <Headset size={36} className="welcome-icon" />
                <p>Salam! Sizə necə kömək edə bilərik?</p>
                <span className="sub-hint">Sualınızı bura yazın, komandamız anında cavablandıracaq.</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`chat-bubble ${msg.sender === 'user' ? 'outgoing' : 'incoming'}`}>
                  <p>{msg.message}</p>
                  <span className="msg-time">
                    {new Date(msg.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Form */}
          <form className="chat-window-footer" onSubmit={handleSendMessage}>
            {!session && !conversation && (
              <input
                type="text"
                className="chat-guest-name-input"
                placeholder="Adınız (istəyə bağlı)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            )}
            <div className="chat-input-row">
              <input
                type="text"
                placeholder="Mesajınızı yazın..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                required
              />
              <button type="submit" className="chat-send-btn" disabled={loading}>
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
