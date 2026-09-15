'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Send, Video, Moon, Sun, RefreshCw, Film,
  MessageSquare, BarChart3, LogIn, ExternalLink,
  Hash, Calendar, Search, Sparkles, ChevronLeft,
  ChevronRight, Play, Wifi, WifiOff, X, Check,
  AlertCircle, Info, Loader2, Zap, TrendingUp,
  BookOpen, Settings, Home as HomeIcon,
  KeyRound, Database, Lock, UserRound, Eye, EyeOff
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  reelUrls?: string[];
}

interface Reel {
  _id: string;
  reelUrl: string;
  caption: string;
  tags: string[];
  transcript?: string;
  createdAt: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

type ActiveView = 'chat' | 'reels' | 'stats' | 'settings';

const API_BASE = 'http://localhost:3001/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function extractReelUrls(text: string): string[] {
  const urlRegex = /https?:\/\/(www\.)?instagram\.com\/reels?\/[^\s,]+/gi;
  return [...new Set(text.match(urlRegex) || [])];
}

function uid(): string {
  return Math.random().toString(36).slice(2);
}

// ─── Components ───────────────────────────────────────────────────────────────

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="theme-toggle"
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Theme"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  const icons = {
    success: <Check size={16} className="text-green-500" />,
    error: <AlertCircle size={16} className="text-red-500" />,
    info: <Info size={16} style={{ color: 'var(--accent-purple)' }} />,
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      {icons[toast.type]}
      <span>{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-wrapper bot">
      <div className="message-avatar avatar-bot">
        <Sparkles size={16} />
      </div>
      <div className="message-bubble bubble-bot">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const reelUrls = msg.reelUrls || [];

  const cleanText = msg.content
    .replace(/https?:\/\/(www\.)?instagram\.com\/reels?\/[^\s,]+/gi, '')
    .replace(/Reels:\s*/i, '')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'bot'}`}>
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-bot'}`}>
        {isUser ? 'U' : <Sparkles size={15} />}
      </div>
      <div>
        <div className={`message-bubble ${isUser ? 'bubble-user' : 'bubble-bot'}`}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{cleanText}</p>

          {reelUrls.length > 0 && !isUser && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📌 Matched Reels
              </p>
              {reelUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="reel-url-card"
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Film size={14} color="white" />
                  </div>
                  <span className="reel-url-text">{url}</span>
                  <ExternalLink size={13} style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--text-muted)' }} />
                </a>
              ))}
            </div>
          )}
        </div>
        <p className="message-time">{formatTime(msg.timestamp)}</p>
      </div>
    </div>
  );
}

function ReelCard({ reel }: { reel: Reel }) {
  const gradients = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'linear-gradient(135deg, #0d0d0d 0%, #1a0505 50%, #2d0808 100%)',
    'linear-gradient(135deg, #0a0a1a 0%, #0d1a0d 50%, #0a2010 100%)',
    'linear-gradient(135deg, #1a0a0a 0%, #1a1a0a 50%, #0a1a1a 100%)',
  ];
  const gradIdx = reel._id ? reel._id.charCodeAt(0) % gradients.length : 0;

  return (
    <div className="reel-card" onClick={() => window.open(reel.reelUrl, '_blank')}>
      <div className="reel-thumbnail" style={{ background: gradients[gradIdx] }}>
        <div className="reel-thumbnail-placeholder">
          <Film size={32} color="white" />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Instagram Reel</span>
        </div>
        <div className="play-btn-overlay">
          <div className="play-circle">
            <Play size={18} style={{ color: '#333', marginLeft: '2px' }} />
          </div>
        </div>
        <div className="reel-thumbnail-overlay">
          <a
            href={reel.reelUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ExternalLink size={12} /> Open on Instagram
          </a>
        </div>
      </div>
      <div className="reel-info">
        <p className="reel-caption">{reel.caption || 'No caption available'}</p>
        {reel.tags && reel.tags.length > 0 && (
          <div className="reel-tags">
            {reel.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="tag-chip">#{tag}</span>
            ))}
            {reel.tags.length > 4 && (
              <span className="tag-chip">+{reel.tags.length - 4}</span>
            )}
          </div>
        )}
        <div className="reel-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={11} />
            {new Date(reel.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <a
            href={reel.reelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reel-url-link"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink size={11} /> View
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [isDark, setIsDark] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const [reels, setReels] = useState<Reel[]>([]);
  const [reelsLoading, setReelsLoading] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncUsername, setSyncUsername] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // ── Check Backend ──────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        await axios.get(`${API_BASE.replace('/api', '')}/health`, { timeout: 3000 });
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Scroll to Bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = uid();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Settings ───────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<Record<string, string>>({
    openaiApiKey: '',
    googleApiKey: '',
    mongodbUri: '',
    instagramUsername: '',
    instagramPassword: '',
  });
  const [settingsMeta, setSettingsMeta] = useState<Record<string, boolean>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      const meta = res.data;
      setSettingsMeta({
        openaiApiKey: !!meta.openaiApiKeySet,
        googleApiKey: !!meta.googleApiKeySet,
        mongodbUri: !!meta.mongodbUriSet,
        instagramUsername: !!meta.instagramUsername,
        instagramPassword: !!meta.instagramPasswordSet,
      });
      setSettings(prev => ({
        ...prev,
        instagramUsername: meta.instagramUsername || '',
      }));
    } catch {
      addToast('error', 'Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  }, [addToast]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await axios.post(`${API_BASE}/settings`, {
        openaiApiKey: settings.openaiApiKey || undefined,
        googleApiKey: settings.googleApiKey || undefined,
        mongodbUri: settings.mongodbUri || undefined,
        instagramUsername: settings.instagramUsername || undefined,
        instagramPassword: settings.instagramPassword || undefined,
      });
      const meta = res.data;
      setSettingsMeta({
        openaiApiKey: !!meta.openaiApiKeySet,
        googleApiKey: !!meta.googleApiKeySet,
        mongodbUri: !!meta.mongodbUriSet,
        instagramUsername: !!meta.instagramUsername,
        instagramPassword: !!meta.instagramPasswordSet,
      });
      setSettings(prev => ({
        ...prev,
        openaiApiKey: '',
        googleApiKey: '',
        mongodbUri: '',
        instagramPassword: '',
      }));
      addToast('success', 'Settings saved! Restart backend to apply MongoDB/embedding changes.');
    } catch {
      addToast('error', 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── Textarea auto-resize ───────────────────────────────────────────────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ── Send Message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!prompt.trim() || loading) return;

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/chat/query`, { prompt: userMsg.content });
      const rawContent = res.data.response + '\n\nReels: ' + (res.data.reels || []).join(', ');
      const reelUrls = extractReelUrls(rawContent).concat(res.data.reels || []);
      const uniqueUrls = [...new Set(reelUrls)];

      const botMsg: Message = {
        id: uid(),
        role: 'bot',
        content: res.data.response || 'Here are the matching reels I found.',
        timestamp: new Date(),
        reelUrls: uniqueUrls,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const botMsg: Message = {
        id: uid(),
        role: 'bot',
        content: err.response?.status === 500
          ? 'The backend encountered an error. Please check your MongoDB and API key configuration.'
          : 'Unable to reach the backend. Please ensure the server is running on port 3001.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      addToast('error', 'Failed to process your query');
    } finally {
      setLoading(false);
    }
  };

  // ── Load Reels ─────────────────────────────────────────────────────────────
  const loadReels = useCallback(async () => {
    setReelsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/reels`);
      setReels(res.data);
    } catch {
      addToast('error', 'Failed to fetch reels');
    } finally {
      setReelsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeView === 'reels' || activeView === 'stats') {
      loadReels();
    }
  }, [activeView, loadReels]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    try {
      addToast('info', 'Opening Instagram login on server...');
      await axios.post(`${API_BASE}/reels/login`);
      addToast('success', 'Login session saved successfully!');
    } catch {
      addToast('error', 'Failed to trigger login. Check server logs.');
    }
  };

  // ── Sync Reels ─────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!syncUsername.trim()) {
      addToast('error', 'Please enter your Instagram username');
      return;
    }
    setSyncing(true);
    setShowSyncModal(false);
    try {
      const res = await axios.post(`${API_BASE}/reels/sync`, { username: syncUsername });
      addToast('success', `Synced ${res.data.syncedCount} new reels!`);
      if (activeView === 'reels') loadReels();
    } catch {
      addToast('error', 'Sync failed. Ensure you are logged in first.');
    } finally {
      setSyncing(false);
    }
  };

  // ── Suggestion click ───────────────────────────────────────────────────────
  const handleSuggestion = (text: string) => {
    setPrompt(text);
    textareaRef.current?.focus();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Stats calculations
  const tagCount = reels.reduce((acc, r) => {
    r.tags?.forEach(t => acc.add(t));
    return acc;
  }, new Set<string>()).size;

  const suggestions = [
    'Find reels about Next.js server actions',
    'Show me cooking tutorial reels',
    'Find reels about React hooks',
    'Show motivational fitness reels',
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Nav items
  const navItems = [
    { id: 'chat' as ActiveView, icon: <MessageSquare size={18} />, label: 'AI Chat' },
    { id: 'reels' as ActiveView, icon: <Film size={18} />, label: 'Saved Reels', badge: reels.length > 0 ? reels.length : undefined },
    { id: 'stats' as ActiveView, icon: <BarChart3 size={18} />, label: 'Analytics' },
    { id: 'settings' as ActiveView, icon: <Settings size={18} />, label: 'Settings' },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="app-container" data-theme={isDark ? 'dark' : 'light'}>

      {/* ═══ Sidebar ═════════════════════════════════════════════════════════ */}
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Video size={20} color="white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div className="logo-text">Insta AI</div>
              <div className="logo-tagline">Reels Intelligence</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {!sidebarCollapsed && <div className="nav-section-label">Navigation</div>}

          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveView(item.id);
                if (item.id === 'settings') loadSettings();
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="nav-item-text">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="nav-item-badge">{item.badge}</span>
                  )}
                </>
              )}
            </button>
          ))}

          <div className="divider" style={{ margin: '12px 0' }} />

          {!sidebarCollapsed && <div className="nav-section-label">Account</div>}

          <button className="nav-item" onClick={handleLogin} title={sidebarCollapsed ? 'Login to Instagram' : undefined}>
            <span className="nav-item-icon"><LogIn size={18} /></span>
            {!sidebarCollapsed && <span className="nav-item-text">Login to Instagram</span>}
          </button>

          <button
            className="nav-item"
            onClick={() => setShowSyncModal(true)}
            title={sidebarCollapsed ? 'Sync Reels' : undefined}
            disabled={syncing}
          >
            <span className="nav-item-icon">
              {syncing ? <Loader2 size={18} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <RefreshCw size={18} />}
            </span>
            {!sidebarCollapsed && <span className="nav-item-text">{syncing ? 'Syncing...' : 'Sync Reels'}</span>}
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {backendOnline !== null && !sidebarCollapsed && (
            <div className={`status-badge ${backendOnline ? 'status-online' : 'status-offline'}`}>
              <span className="status-dot" />
              {backendOnline ? 'Backend Online' : 'Backend Offline'}
            </div>
          )}

          {sidebarCollapsed && backendOnline !== null && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {backendOnline ? (
                <Wifi size={16} style={{ color: '#22c55e' }} />
              ) : (
                <WifiOff size={16} style={{ color: '#ef4444' }} />
              )}
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(p => !p)}
            className="btn btn-ghost btn-icon"
            style={{ width: '100%', justifyContent: 'center' }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* ═══ Main Content ════════════════════════════════════════════════════ */}
      <main className="main-content">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="app-header">
          <div className="header-title">
            <h2>
              {activeView === 'chat' && '✨ AI Assistant'}
              {activeView === 'reels' && '🎬 Saved Reels'}
              {activeView === 'stats' && '📊 Analytics'}
              {activeView === 'settings' && '⚙️ Settings'}
            </h2>
            <p>
              {activeView === 'chat' && 'Ask anything about your saved Instagram reels'}
              {activeView === 'reels' && `${reels.length} reels indexed and searchable`}
              {activeView === 'stats' && 'Insights about your reel collection'}
              {activeView === 'settings' && 'Configure API keys and your Instagram account'}
            </p>
          </div>

          <div className="header-actions">
            {activeView === 'reels' && (
              <button className="btn btn-secondary" onClick={loadReels} disabled={reelsLoading}>
                <RefreshCw size={15} style={{ animation: reelsLoading ? 'spin-slow 1s linear infinite' : 'none' }} />
                <span>Refresh</span>
              </button>
            )}
            {activeView === 'chat' && messages.length > 0 && (
              <button className="btn btn-secondary" onClick={() => setMessages([])}>
                <X size={15} />
                <span>Clear Chat</span>
              </button>
            )}
            <ThemeToggle dark={isDark} onToggle={() => setIsDark(p => !p)} />
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            ── CHAT VIEW ──────────────────────────────────────────────────
        ════════════════════════════════════════════════════════════════════ */}
        {activeView === 'chat' && (
          <div className="chat-area">
            <div className="messages-container">
              {messages.length === 0 ? (
                /* Empty State */
                <div className="empty-state">
                  <div className="empty-icon">
                    <Sparkles size={36} color="white" />
                  </div>
                  <h3>Ask about your saved Reels</h3>
                  <p>
                    I use AI-powered semantic search to find the exact reels you're
                    looking for from your saved Instagram collection.
                  </p>
                  <div className="suggestions-grid">
                    {suggestions.map((s, i) => (
                      <button key={i} className="suggestion-chip" onClick={() => handleSuggestion(s)}>
                        <Search size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {loading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="input-area">
              <div className="input-container">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  placeholder="Ask me to find specific reels..."
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                  rows={1}
                  aria-label="Chat input"
                />
                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={loading || !prompt.trim()}
                  aria-label="Send message"
                >
                  {loading ? <Loader2 size={18} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Send size={18} />}
                </button>
              </div>
              <p className="input-hint">
                Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>Enter</kbd> to send · <kbd style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>Shift+Enter</kbd> for new line
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ── REELS VIEW ─────────────────────────────────────────────────
        ════════════════════════════════════════════════════════════════════ */}
        {activeView === 'reels' && (
          <div className="reels-view">
            {reelsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="reel-card">
                    <div className="skeleton" style={{ height: '200px', borderRadius: '0' }} />
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="skeleton" style={{ height: '16px', borderRadius: '8px' }} />
                      <div className="skeleton" style={{ height: '14px', width: '70%', borderRadius: '8px' }} />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="skeleton" style={{ height: '22px', width: '60px', borderRadius: '20px' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : reels.length === 0 ? (
              <div className="empty-state" style={{ minHeight: '400px' }}>
                <div className="empty-icon">
                  <Film size={36} color="white" />
                </div>
                <h3>No Reels Yet</h3>
                <p>Login to Instagram and sync your saved reels to get started.</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={handleLogin}>
                    <LogIn size={16} /> Login to Instagram
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowSyncModal(true)}>
                    <RefreshCw size={16} /> Sync Reels
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="reels-header">
                  <p className="reels-count">
                    <Film size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    {reels.length} reels in your collection
                  </p>
                </div>
                <div className="reels-grid">
                  {reels.map(reel => (
                    <ReelCard key={reel._id} reel={reel} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ── STATS VIEW ─────────────────────────────────────────────────
        ════════════════════════════════════════════════════════════════════ */}
        {activeView === 'stats' && (
          <div className="reels-view">
            <div className="stats-grid">
              {[
                {
                  icon: <Film size={22} color="white" />,
                  bg: 'var(--gradient-brand)',
                  value: reels.length,
                  label: 'Total Reels Saved',
                },
                {
                  icon: <Hash size={22} color="white" />,
                  bg: 'linear-gradient(135deg, #667eea, #764ba2)',
                  value: tagCount,
                  label: 'Unique Tags',
                },
                {
                  icon: <MessageSquare size={22} color="white" />,
                  bg: 'linear-gradient(135deg, #f093fb, #f5576c)',
                  value: messages.length,
                  label: 'Queries Asked',
                },
                {
                  icon: <Zap size={22} color="white" />,
                  bg: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                  value: reels.filter(r => r.transcript).length,
                  label: 'With Transcripts',
                },
              ].map((stat, i) => (
                <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="stat-icon" style={{ background: stat.bg }}>
                    {stat.icon}
                  </div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {reels.length > 0 && (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Recent Additions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {reels.slice(0, 5).map(reel => (
                    <div
                      key={reel._id}
                      className="reel-card"
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px' }}
                      onClick={() => window.open(reel.reelUrl, '_blank')}
                    >
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Film size={20} color="white" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {reel.caption || 'No caption'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(reel.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="reel-tags" style={{ margin: 0, flexShrink: 0 }}>
                        {reel.tags?.slice(0, 2).map((t, i) => <span key={i} className="tag-chip">#{t}</span>)}
                      </div>
                      <ExternalLink size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {reels.length === 0 && !reelsLoading && (
              <div className="empty-state" style={{ minHeight: '300px' }}>
                <div className="empty-icon">
                  <BarChart3 size={36} color="white" />
                </div>
                <h3>No Data Yet</h3>
                <p>Sync your reels to see analytics and insights here.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ── SETTINGS VIEW ─────────────────────────────────────────────
        ════════════════════════════════════════════════════════════════════ */}
        {activeView === 'settings' && (
          <div className="reels-view settings-view">
            {settingsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <Loader2 size={28} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--accent-purple)' }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>

                  {/* API Keys */}
                  <div className="settings-card">
                    <div className="settings-card-header">
                      <div className="settings-card-icon" style={{ background: 'var(--gradient-brand)' }}>
                        <KeyRound size={18} color="white" />
                      </div>
                      <div>
                        <h3>API Keys</h3>
                        <p>Enables the AI chatbot, embeddings & database</p>
                      </div>
                    </div>

                    <div className="settings-field">
                      <label>Google Gemini API Key <span className="required">*</span></label>
                      <div className="settings-input-wrap">
                        <KeyRound size={15} className="settings-input-icon" />
                        <input
                          type="password"
                          placeholder={settingsMeta.googleApiKey ? '••••••••  (saved)' : 'AIzaSy...'}
                          value={settings.googleApiKey}
                          onChange={e => setSettings(p => ({ ...p, googleApiKey: e.target.value }))}
                        />
                        {settingsMeta.googleApiKey && <span className="saved-chip">Saved</span>}
                      </div>
                      <p className="settings-hint">Used by the chatbot to generate AI answers.</p>
                    </div>

                    <div className="settings-field">
                      <label>OpenAI API Key</label>
                      <div className="settings-input-wrap">
                        <KeyRound size={15} className="settings-input-icon" />
                        <input
                          type="password"
                          placeholder={settingsMeta.openaiApiKey ? '••••••••  (saved)' : 'sk-proj-...'}
                          value={settings.openaiApiKey}
                          onChange={e => setSettings(p => ({ ...p, openaiApiKey: e.target.value }))}
                        />
                        {settingsMeta.openaiApiKey && <span className="saved-chip">Saved</span>}
                      </div>
                      <p className="settings-hint">Used to embed reel captions for semantic search.</p>
                    </div>

                    <div className="settings-field">
                      <label>MongoDB URI</label>
                      <div className="settings-input-wrap">
                        <Database size={15} className="settings-input-icon" />
                        <input
                          type="password"
                          placeholder={settingsMeta.mongodbUri ? '••••••••  (saved)' : 'mongodb+srv://...'}
                          value={settings.mongodbUri}
                          onChange={e => setSettings(p => ({ ...p, mongodbUri: e.target.value }))}
                        />
                        {settingsMeta.mongodbUri && <span className="saved-chip">Saved</span>}
                      </div>
                      <p className="settings-hint">Optional — stores reels in a database.</p>
                    </div>
                  </div>

                  {/* Instagram Account */}
                  <div className="settings-card">
                    <div className="settings-card-header">
                      <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #f09433, #dc2743)' }}>
                        <UserRound size={18} color="white" />
                      </div>
                      <div>
                        <h3>Instagram Account</h3>
                        <p>Auto-login to fetch your saved reels</p>
                      </div>
                    </div>

                    <div className="settings-field">
                      <label>Instagram Username</label>
                      <div className="settings-input-wrap">
                        <UserRound size={15} className="settings-input-icon" />
                        <input
                          placeholder={settingsMeta.instagramUsername ? settings.instagramUsername : 'username'}
                          value={settings.instagramUsername}
                          onChange={e => setSettings(p => ({ ...p, instagramUsername: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="settings-field">
                      <label>Instagram Password</label>
                      <div className="settings-input-wrap">
                        <Lock size={15} className="settings-input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={settingsMeta.instagramPassword ? '••••••••  (saved)' : 'password'}
                          value={settings.instagramPassword}
                          onChange={e => setSettings(p => ({ ...p, instagramPassword: e.target.value }))}
                        />
                        <button
                          className="settings-eye"
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <p className="settings-hint">
                        Stored securely on your server and used only for logging into Instagram.
                      </p>
                    </div>

                    <div style={{ padding: '12px 14px', background: 'rgba(131,58,180,0.06)', borderRadius: '10px', border: '1px solid rgba(131,58,180,0.1)' }}>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        ⚠️ After saving, click <b>Login to Instagram</b> in the sidebar. A browser opens and logs in automatically.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" onClick={handleSaveSettings} disabled={settingsSaving}>
                    {settingsSaving ? <Loader2 size={15} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Check size={15} />}
                    {settingsSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button className="btn btn-secondary" onClick={loadSettings} disabled={settingsLoading}>
                    <RefreshCw size={15} /> Reload
                  </button>
                </div>

                <p className="settings-hint" style={{ marginTop: '12px', fontSize: '12px' }}>
                  Keys are stored in <code>backend/settings.json</code> on your machine (never in the browser).
                  Restart the backend after saving MongoDB or OpenAI keys.
                </p>
              </>
            )}
          </div>
        )}
      </main>

      {/* ═══ Sync Modal ══════════════════════════════════════════════════════ */}
      {showSyncModal && (
        <div className="modal-backdrop" onClick={() => setShowSyncModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', background: 'var(--gradient-brand)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={20} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Sync Reels</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Enter your Instagram username</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Instagram Username
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: 'var(--bg-input)', border: '1.5px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <span style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '16px', fontWeight: 600 }}>@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={syncUsername}
                  onChange={e => setSyncUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSync()}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '12px 14px 12px 0',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(131,58,180,0.06)', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(131,58,180,0.1)' }}>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ⚠️ Make sure you're logged in to Instagram first. The scraper requires an active session on the server.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowSyncModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSync}>
                <RefreshCw size={15} /> Start Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Toast Notifications ═════════════════════════════════════════════ */}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
