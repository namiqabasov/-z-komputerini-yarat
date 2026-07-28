import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquare, X, Send, User, Headset, Circle, Image as ImageIcon } from 'lucide-react';
import './LiveChatWidget.css';

export default function LiveChatWidget({ session, onRequireLogin }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // If user is not logged in, clicking chat triggers login redirect
  const handleOpenChat = () => {
    if (!session) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    setIsOpen(true);
  };

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

  // Load or create active conversation for authenticated user
  useEffect(() => {
    async function initConversation() {
      if (!session?.user?.id) return;
      try {
        const { data: convData } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('status', 'active')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

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

  // Supabase Realtime Subscription for incoming admin messages AND conversation status update
  useEffect(() => {
    if (!conversation?.id) return;

    // 1. Listen for new messages
    const msgChannel = supabase
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

    // 2. Listen for conversation status changes (e.g. closed by admin)
    const convChannel = supabase
      .channel(`chat_conv_status:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `id=eq.${conversation.id}`
        },
        (payload) => {
          if (payload.new && payload.new.status) {
            setConversation((prev) => ({ ...prev, status: payload.new.status }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
    };
  }, [conversation?.id, isOpen]);

  // Handle Image File Upload to Supabase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      let currentConv = conversation;
      if (!currentConv) {
        const payload = {
          guest_identifier: session?.user?.id || 'auth_user',
          guest_name: session?.user?.user_metadata?.full_name || session?.user?.email || 'İstifadəçi',
          user_id: session?.user?.id,
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

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `chat/${fileName}`;

      // Upload image to receipts bucket or public storage bucket
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: publicUrlObj } = supabase.storage.from('receipts').getPublicUrl(filePath);
      const imageUrl = publicUrlObj.publicUrl;

      // Insert message containing image tag [IMAGE]:url
      const imageMsgContent = `[IMAGE]:${imageUrl}`;

      const { data: insertedMsg } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConv.id,
          sender: 'user',
          message: imageMsgContent
        })
        .select()
        .single();

      if (insertedMsg) {
        setMessages(prev => [...prev, insertedMsg]);
        await supabase
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', currentConv.id);
      }
    } catch (err) {
      alert("Şəkil yüklənmə xətası: " + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  // Send text message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      let currentConv = conversation;

      if (!currentConv) {
        const payload = {
          guest_identifier: session?.user?.id || 'auth_user',
          guest_name: session?.user?.user_metadata?.full_name || session?.user?.email || 'İstifadəçi',
          user_id: session?.user?.id,
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

      const tempId = 'temp_' + Date.now();
      const newMsgObj = {
        id: tempId,
        conversation_id: currentConv.id,
        sender: 'user',
        message: textToSend,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, newMsgObj]);

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
        <button className="chat-floating-btn" onClick={handleOpenChat} title="Canlı Dəstək">
          <Headset size={26} />
          <span>Canlı Dəstək</span>
          {unreadCount > 0 && <span className="chat-unread-badge">{unreadCount}</span>}
        </button>
      )}

      {/* Floating Chat Modal Window */}
      {isOpen && session && (
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
                  {msg.message.startsWith('[IMAGE]:') ? (
                    <a href={msg.message.replace('[IMAGE]:', '')} target="_blank" rel="noopener noreferrer">
                      <img src={msg.message.replace('[IMAGE]:', '')} alt="Şəkil" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '4px' }} />
                    </a>
                  ) : (
                    <p>{msg.message}</p>
                  )}
                  <span className="msg-time">
                    {new Date(msg.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Form */}
          {conversation?.status === 'closed' ? (
            <div style={{ padding: '12px', textAlign: 'center', background: '#fef2f2', color: '#dc2626', borderTop: '1px solid #fee2e2', fontWeight: '600', fontSize: '0.85rem' }}>
              🔒 Bu söhbət operator tərəfindən bağlandı. Artıq mesaj yazmaq mümkün deyil.
            </div>
          ) : (
            <form className="chat-window-footer" onSubmit={handleSendMessage}>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleImageUpload} 
              />
              <div className="chat-input-row">
                <button 
                  type="button" 
                  className="chat-attach-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImg}
                  title="Şəkil Yüklə"
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}
                >
                  <ImageIcon size={18} />
                </button>
                <input
                  type="text"
                  placeholder={uploadingImg ? "Şəkil yüklənir..." : "Mesajınızı yazın..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={uploadingImg}
                />
                <button type="submit" className="chat-send-btn" disabled={loading || uploadingImg}>
                  <Send size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
