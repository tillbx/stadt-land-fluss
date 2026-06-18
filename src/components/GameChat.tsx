import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Send, X } from 'lucide-react';
import type { PlayerRecord } from '../hooks/useGameRoom';
import { PlayerAvatar } from './PlayerAvatar';
import { audioHelper } from '../utils/AudioHelper';

interface GameChatProps {
  messages: any[];
  onSendMessage: (text: string) => Promise<void>;
  onSendEmote: (emoji: string) => Promise<void>;
  players: PlayerRecord[];
  me: PlayerRecord;
  roomStatus: string;
  onSetTypingStatus?: (isTyping: boolean) => void | Promise<void>;
}

const QUICK_EMOTES = ['🔥', '😂', '👍', '😢'];

export function GameChat({
  messages,
  onSendMessage,
  onSendEmote,
  players,
  me,
  roomStatus,
  onSetTypingStatus,
}: GameChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  const typingPlayers = players.filter((p) => p.id !== me.id && p.is_typing);
  const isSomeoneTyping = typingPlayers.length > 0;

  // Typing indicator debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!onSetTypingStatus) return;

    if (inputText.trim().length > 0) {
      onSetTypingStatus(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onSetTypingStatus(false);
      }, 3000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onSetTypingStatus(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputText, onSetTypingStatus]);

  useEffect(() => {
    if (!isOpen && onSetTypingStatus) {
      onSetTypingStatus(false);
    }
  }, [isOpen, onSetTypingStatus]);

  // Censor is not allowed / Chat is hidden during rounds (playing or spinning status)
  const isChatHidden = roomStatus === 'playing' || roomStatus === 'spinning';

  // Scroll to bottom on new messages, and handle unread count when chat is closed
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      if (!isOpen) {
        setUnreadCount((prev) => prev + (messages.length - prevMessagesLength.current));
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isOpen]);

  // Floating emotes listener (displays flying emotes over avatar tags)
  useEffect(() => {
    const handleEmote = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { player_id, emoji } = customEvent.detail;

      // Try to find the reacting player's avatar in the DOM
      const avatarEl = document.getElementById(`avatar-${player_id}`);
      if (!avatarEl) return;

      const rect = avatarEl.getBoundingClientRect();

      // Create a floating element for the emoji
      const floatEl = document.createElement('div');
      floatEl.innerText = emoji;
      floatEl.style.position = 'fixed';
      // Center horizontally on the avatar, position at the top
      floatEl.style.left = `${rect.left + rect.width / 2}px`;
      floatEl.style.top = `${rect.top}px`;
      floatEl.style.transform = 'translate(-50%, -50%)';
      floatEl.style.fontSize = '2.2rem';
      floatEl.style.zIndex = '99999';
      floatEl.style.pointerEvents = 'none';
      floatEl.style.animation = 'emote-float-up 1.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards';

      // Insert global styles for the float-up animation if missing
      if (!document.getElementById('emote-float-styles')) {
        const style = document.createElement('style');
        style.id = 'emote-float-styles';
        style.innerHTML = `
          @keyframes emote-float-up {
            0% {
              transform: translate(-50%, -20%) scale(0.4);
              opacity: 0;
            }
            15% {
              transform: translate(-50%, -100%) scale(1.3);
              opacity: 1;
            }
            45% {
              transform: translate(-50%, -160%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -280%) scale(0.7);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(floatEl);

      // Clean up DOM node
      setTimeout(() => {
        floatEl.remove();
      }, 1600);
    };

    window.addEventListener('slf_emote_received', handleEmote);
    return () => {
      window.removeEventListener('slf_emote_received', handleEmote);
    };
  }, []);

  if (isChatHidden) {
    return null;
  }

  const handleOpenToggle = () => {
    audioHelper.playClick();
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    audioHelper.playClick();
    const textToSend = inputText.trim();
    setInputText('');
    if (onSetTypingStatus) {
      onSetTypingStatus(false);
    }
    await onSendMessage(textToSend);
  };

  const handleSendEmoji = async (emoji: string) => {
    audioHelper.playClick();
    await onSendEmote(emoji);
  };

  return createPortal(
    <>
      {/* Sticky Bottom-Right Chat Trigger Button */}
      <button
        onClick={handleOpenToggle}
        className="chat-toggle-btn"
        style={{
          borderColor: isSomeoneTyping && !isOpen ? 'var(--accent)' : undefined,
          boxShadow: isSomeoneTyping && !isOpen ? '0 0 15px var(--accent-glow)' : undefined,
        }}
        title={isSomeoneTyping ? `${typingPlayers.map(p => p.name).join(', ')} schreibt...` : "Chat öffnen"}
      >
        {isOpen ? (
          <X size={24} />
        ) : isSomeoneTyping ? (
          <div className="typing-indicator-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        ) : (
          <MessageSquare size={24} />
        )}
        {!isOpen && unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: 'var(--danger)',
              color: 'white',
              borderRadius: '50%',
              minWidth: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
              padding: '0 4px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Glassmorphic Chat Box (Intercom Style) */}
      <div
        className="chat-floating-box"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(15px)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            padding: '1rem 1.2rem',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Spiel-Chat</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem',
            }}
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Log Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontStyle: 'italic',
              }}
            >
              Keine Nachrichten vorhanden. Schreib was!
            </div>
          ) : (
            messages
              .filter((m) => m.type !== 'emote') // Filter out floating visual emotes from the logs
              .map((m) => {
                // 1. Render system join/leave logs
                if (m.type === 'system') {
                  const isJoin = m.text === 'PLAYER_JOINED';
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        margin: '0.1rem 0',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      {isJoin ? (
                        <span>🟢 <strong>{m.player_name}</strong> ist der Lobby beigetreten</span>
                      ) : (
                        <span>🔴 <strong>{m.player_name}</strong> hat das Spiel verlassen</span>
                      )}
                    </div>
                  );
                }

                // 2. Render creativity heart likes
                if (m.type === 'like') {
                  try {
                    const likeData = JSON.parse(m.text);
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: 'center',
                          fontSize: '0.75rem',
                          color: 'var(--secondary)',
                          background: 'rgba(236, 72, 153, 0.06)',
                          border: '1px solid rgba(236, 72, 153, 0.15)',
                          padding: '0.4rem 0.7rem',
                          borderRadius: '14px',
                          margin: '0.1rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          textAlign: 'center',
                          maxWidth: '92%',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}
                      >
                        <span>❤️</span>
                        <span>
                          <strong>{m.player_name}</strong> gefällt die Antwort <strong>"{likeData.word}"</strong> von <strong>{likeData.target}</strong> in <em>{likeData.category}</em>
                        </span>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                }

                // 3. Render standard chat messages
                const isMe = m.player_id === me?.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        marginBottom: '0.15rem',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {!isMe && (
                        <PlayerAvatar
                          name={m.player_name}
                          avatar={m.avatar}
                          style={{ width: '14px', height: '14px', borderRadius: '50%', fontSize: '0.45rem' }}
                        />
                      )}
                      <span>{isMe ? 'Ich' : m.player_name}</span>
                    </div>
                    <div
                      style={{
                        padding: '0.5rem 0.8rem',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMe ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        fontSize: '0.8rem',
                        maxWidth: '85%',
                        wordBreak: 'break-word',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                        border: '1px solid var(--border-glass)',
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing status bar inside Chat */}
        {isSomeoneTyping && (
          <div
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.75rem',
              color: 'var(--accent)',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(0, 0, 0, 0.15)',
              borderTop: '1px solid var(--border-glass)',
            }}
          >
            <div className="typing-indicator-dots" style={{ gap: '2px' }}>
              <span className="typing-dot" style={{ width: '4px', height: '4px' }} />
              <span className="typing-dot" style={{ width: '4px', height: '4px' }} />
              <span className="typing-dot" style={{ width: '4px', height: '4px' }} />
            </div>
            <span>
              {typingPlayers.map(p => p.name).join(', ')} schreibt...
            </span>
          </div>
        )}

        {/* Quick Reactions & Chat Input */}
        <div
          style={{
            padding: '0.8rem',
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          }}
        >
          {/* Quick Reactions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
              REAKTION:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {QUICK_EMOTES.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendEmoji(emoji)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.4rem',
                    cursor: 'pointer',
                    padding: '0.15rem',
                    transition: 'transform 0.15s ease',
                    userSelect: 'none',
                  }}
                  className="emote-btn"
                  title={`Reagiere mit ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Form */}
          <form onSubmit={handleSendText} style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              placeholder="Schreibe eine Nachricht..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: inputText.trim() ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Global CSS inside a <style> tag for fixed positioning, hover scales, and mobile scaling */}
      <style>{`
        .chat-toggle-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          border: 1px solid var(--border-glass);
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.15);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-main);
          outline: none;
        }
        .chat-toggle-btn:hover {
          transform: scale(1.1);
          border-color: var(--primary);
          box-shadow: 0 10px 40px 0 var(--primary-glow), inset 0 1px 1px rgba(255,255,255,0.25);
        }
        .chat-toggle-btn:active {
          transform: scale(0.95);
        }
        .chat-toggle-btn svg {
          display: block;
          transition: transform 0.2s ease;
        }
        .chat-toggle-btn:hover svg {
          transform: scale(1.05);
        }
        .chat-floating-box {
          position: fixed;
          bottom: 85px;
          right: 20px;
          width: 360px;
          height: 500px;
          max-height: 75vh;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-glass);
          background: var(--bg-card);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255,255,255,0.1);
          padding: 0;
          overflow: hidden;
          transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .emote-btn {
          transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .emote-btn:hover {
          transform: scale(1.3);
        }
        .emote-btn:active {
          transform: scale(0.9);
        }
        @media (max-width: 480px) {
          .chat-floating-box {
            width: calc(100% - 40px) !important;
            right: 20px !important;
            left: 20px !important;
            bottom: 85px !important;
            height: 480px !important;
          }
          .chat-toggle-btn {
            bottom: 15px !important;
            right: 15px !important;
            width: 50px !important;
            height: 50px !important;
          }
        }
        .typing-indicator-dots {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          background-color: var(--accent);
          border-radius: 50%;
          animation: typingBounce 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        .typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        @keyframes typingBounce {
          0%, 80%, 100% { 
            transform: scale(0);
          } 40% { 
            transform: scale(1);
          }
        }
      `}</style>
    </>,
    document.body
  );
}
