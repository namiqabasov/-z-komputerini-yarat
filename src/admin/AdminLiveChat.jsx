import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Headset, MessageSquare, Send, CheckCircle2, Archive, User, Circle, Trash2, RefreshCw, Image as ImageIcon, Mic, Square } from 'lucide-react';
import './AdminLiveChat.css';

export default function AdminLiveChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [adminInput, setAdminInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

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

  // Admin send image file
  const handleAdminImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConv) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `chat/${fileName}`;

      const { error: uploadErr } = await supabase.storage.from('receipts').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: publicUrlObj } = supabase.storage.from('receipts').getPublicUrl(filePath);
      const imageUrl = publicUrlObj.publicUrl;
      const imageMsgContent = `[IMAGE]:${imageUrl}`;

      const { data: insertedMsg, error: msgErr } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConv.id,
          sender: 'admin',
          message: imageMsgContent
        })
        .select()
        .single();

      if (!msgErr && insertedMsg) {
        setMessages((prev) => [...prev, insertedMsg]);
        await supabase
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', selectedConv.id);
      }
    } catch (err) {
      alert("Şəkil yüklənmə xətası: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Start Voice Recording (WhatsApp style) with mimeType compatibility fallback
  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Sizin brauzeriniz mikrofon yazmağı dəstəkləmir.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const finalType = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Mikrofon icazəsi xətası: Zəhmət olmasa brauzerdə (ünvan çubuğunda) mikrofona icazə verin. (Xəta: " + err.message + ")");
    }
  };

  // Stop Voice Recording & Send
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Send Voice Message Blob to Storage & DB
  const sendVoiceMessage = async (audioBlob) => {
    if (!selectedConv) return;
    setUploading(true);

    try {
      const fileName = `voice_${Date.now()}_${Math.random().toString(36).substring(2)}.webm`;
      const filePath = `chat/${fileName}`;

      const { error: uploadErr } = await supabase.storage.from('receipts').upload(filePath, audioBlob, {
        contentType: 'audio/webm'
      });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlObj } = supabase.storage.from('receipts').getPublicUrl(filePath);
      const audioUrl = publicUrlObj.publicUrl;
      const audioMsgContent = `[AUDIO]:${audioUrl}`;

      const { data: insertedMsg, error: msgErr } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConv.id,
          sender: 'admin',
          message: audioMsgContent
        })
        .select()
        .single();

      if (!msgErr && insertedMsg) {
        setMessages((prev) => [...prev, insertedMsg]);
        await supabase
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', selectedConv.id);
      }
    } catch (err) {
      alert("Səs göndərmə xətası: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Admin send text message
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

  // Reopen conversation
  const handleReopenConversation = async (convId) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status: 'active' })
        .eq('id', convId);

      if (error) throw error;
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, status: 'active' } : c)));
      if (selectedConv?.id === convId) {
        setSelectedConv((prev) => ({ ...prev, status: 'active' }));
      }
    } catch (err) {
      alert("Yenidən açma xətası: " + err.message);
    }
  };

  // Delete Conversation Completely (Purge messages and images from storage)
  const handleDeleteConversation = async (convId) => {
    if (!window.confirm("Bu söhbəti və bütün mesajlarını (şəkillər daxil) verilənlər bazasından tamamilə silmək istədiyinizə əminsiniz? Yaddaş boşaldılacaq.")) return;

    try {
      // 1. Delete image files from Supabase storage if any
      const { data: msgList } = await supabase
        .from('chat_messages')
        .select('message')
        .eq('conversation_id', convId);

      if (msgList && msgList.length > 0) {
        const imagePaths = msgList
          .filter(m => m.message.startsWith('[IMAGE]:'))
          .map(m => {
            const url = m.message.replace('[IMAGE]:', '');
            const parts = url.split('/receipts/');
            return parts.length > 1 ? parts[1] : null;
          })
          .filter(Boolean);

        if (imagePaths.length > 0) {
          await supabase.storage.from('receipts').remove(imagePaths);
        }
      }

      // 2. Delete messages from database
      await supabase.from('chat_messages').delete().eq('conversation_id', convId);

      // 3. Delete conversation row from database
      const { error: delErr } = await supabase.from('chat_conversations').delete().eq('id', convId);
      if (delErr) throw delErr;

      setConversations(prev => prev.filter(c => c.id !== convId));
      if (selectedConv?.id === convId) {
        setSelectedConv(null);
        setMessages([]);
      }
      alert("Söhbət və bütün məlumatları tamamilə silindi.");
    } catch (err) {
      alert("Silinmə xətası: " + err.message);
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

              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedConv.status === 'active' ? (
                  <button
                    className="close-conv-btn"
                    onClick={() => handleCloseConversation(selectedConv.id)}
                    title="Söhbəti bağla"
                  >
                    <Archive size={16} />
                    <span>Söhbəti Bağla</span>
                  </button>
                ) : (
                  <button
                    className="close-conv-btn"
                    onClick={() => handleReopenConversation(selectedConv.id)}
                    title="Söhbəti Yenidən Aç"
                    style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}
                  >
                    <RefreshCw size={16} />
                    <span>Söhbəti Yenidən Aç</span>
                  </button>
                )}
                
                <button
                  className="close-conv-btn"
                  onClick={() => handleDeleteConversation(selectedConv.id)}
                  title="Söhbəti və məlumatları sil"
                  style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }}
                >
                  <Trash2 size={16} />
                  <span>Söhbəti Sil</span>
                </button>
              </div>
            </div>

            <div className="admin-chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`admin-msg-bubble ${msg.sender === 'admin' ? 'admin' : 'user'}`}>
                  {msg.message.startsWith('[IMAGE]:') ? (
                    <a href={msg.message.replace('[IMAGE]:', '')} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={msg.message.replace('[IMAGE]:', '')} 
                        alt="Şəkil" 
                        style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '8px', marginTop: '4px', objectFit: 'cover' }} 
                      />
                    </a>
                  ) : msg.message.startsWith('[AUDIO]:') ? (
                    <div style={{ padding: '4px 0' }}>
                      <audio 
                        controls 
                        src={msg.message.replace('[AUDIO]:', '')} 
                        style={{ maxWidth: '240px', height: '36px' }}
                      />
                    </div>
                  ) : (
                    <p>{msg.message}</p>
                  )}
                  <span className="admin-msg-time">
                    {new Date(msg.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {selectedConv.status === 'active' ? (
              <form className="admin-chat-input-area" onSubmit={handleSendAdminMessage} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleAdminImageUpload} 
                />
                
                <button
                  type="button"
                  className="close-conv-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || isRecording}
                  title="Şəkil Yüklə"
                  style={{ background: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569', padding: '0.6rem 0.8rem' }}
                >
                  <ImageIcon size={18} />
                </button>

                {isRecording ? (
                  <button
                    type="button"
                    className="close-conv-btn"
                    onClick={stopVoiceRecording}
                    style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Square size={16} fill="#dc2626" />
                    <span>Dayandır & Göndər ({recordingTime}s)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="close-conv-btn"
                    onClick={startVoiceRecording}
                    disabled={uploading}
                    title="Səsli Mesaj Yaz (WhatsApp)"
                    style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', padding: '0.6rem 0.8rem' }}
                  >
                    <Mic size={18} />
                  </button>
                )}

                <input
                  type="text"
                  placeholder={uploading ? "Fayl yüklənir..." : isRecording ? "Səs yazılır..." : "İstifadəçiyə cavab yazın..."}
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  disabled={uploading || isRecording}
                />
                <button type="submit" className="admin-chat-send-btn" disabled={uploading || isRecording || !adminInput.trim()}>
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
