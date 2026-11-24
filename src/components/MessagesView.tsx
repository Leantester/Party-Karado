import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { MessageSquare, Send } from 'lucide-react';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { TranslationBundle } from '../i18n/translations';
import { markConversationRead, sendChatMessage } from '../services/firestoreService';
import { ChatMessage, Conversation } from '../types';

interface MessagesViewProps {
  t: TranslationBundle;
  user: User | null;
  userDisplayName: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onSignIn: () => Promise<void>;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  t,
  user,
  userDisplayName,
  conversations,
  activeConversationId,
  onSelectConversation,
  onSignIn,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;

  useEffect(() => {
    if (!user || !activeConversation) {
      setMessages([]);
      return;
    }

    const role: 'guest' | 'host' =
      activeConversation.hostId === user.uid ? 'host' : 'guest';
    if (
      (role === 'guest' && activeConversation.unreadByGuest > 0) ||
      (role === 'host' && activeConversation.unreadByHost > 0)
    ) {
      void markConversationRead(activeConversation.id, role);
    }

    const msgPath = `conversations/${activeConversation.id}/messages`;
    const q = query(collection(db, msgPath), orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChatMessage);
        setMessages(list);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, msgPath);
      }
    );

    return () => unsub();
  }, [user, activeConversation]);

  const handleSend = async (textToSend?: string) => {
    const body = (textToSend ?? draft).trim();
    if (!body || !user || !activeConversation) return;
    const senderRole: 'guest' | 'host' =
      activeConversation.hostId === user.uid ? 'host' : 'guest';

    setSending(true);
    try {
      await sendChatMessage({
        conversationId: activeConversation.id,
        senderId: user.uid,
        senderName: userDisplayName || user.displayName || 'Party Karado Member',
        senderRole,
        text: body,
      });
      if (!textToSend) setDraft('');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white border border-[#E5E1D8] rounded-xl p-10">
          <MessageSquare className="w-10 h-10 text-[#C83E2B] mx-auto mb-3" />
          <h2 className="font-display text-2xl font-semibold text-[#18181B]">
            {t.messages.title}
          </h2>
          <p className="mt-2 text-sm text-[#57534E] max-w-md mx-auto">
            {t.messages.signInPrompt}
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 px-6 py-3 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] transition-colors cursor-pointer"
          >
            {t.common.signInGoogle}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
          {t.messages.title}
        </h1>
        <p className="mt-1 text-sm text-[#57534E]">{t.messages.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#E5E1D8] rounded-xl overflow-hidden min-h-[540px]">
        {/* Threads List */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E5E1D8] bg-[#FAF9F6]">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-[#18181B]">{t.messages.noThreads}</p>
              <p className="mt-1 text-xs text-[#57534E]">{t.messages.noThreadsDesc}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E5E1D8]">
              {conversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const isHostUser = conv.hostId === user.uid;
                const unread = isHostUser ? conv.unreadByHost : conv.unreadByGuest;
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        isSelected ? 'bg-white' : 'hover:bg-white/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#18181B] truncate">
                          {conv.venueName}
                        </span>
                        {unread > 0 && (
                          <span className="text-xs font-semibold text-[#C83E2B] tabular-nums shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#57534E] mt-0.5 truncate">
                        {isHostUser
                          ? `${t.messages.guestBadge}: ${conv.guestName}`
                          : `${t.messages.hostBadge}: ${conv.hostName}`}
                      </p>
                      <p className="text-xs text-[#78716C] mt-1.5 truncate">
                        {conv.lastMessage || t.messages.typeMessage}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Active Conversation */}
        <div className="lg:col-span-8 flex flex-col h-[540px]">
          {activeConversation ? (
            <>
              <div className="px-5 py-4 border-b border-[#E5E1D8] flex items-center justify-between gap-4 bg-white">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#18181B] truncate">
                    {activeConversation.venueName}
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    {activeConversation.hostId === user.uid
                      ? `${t.messages.guestBadge}: ${activeConversation.guestName}`
                      : `${t.messages.hostBadge}: ${activeConversation.hostName}`}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FAF9F6]/60">
                {messages.length === 0 && (
                  <div className="space-y-3 py-4">
                    <p className="text-xs text-[#57534E]">{t.messages.subtitle}</p>
                    <div className="flex flex-wrap gap-2">
                      {t.messages.quickQuestions.map((qText) => (
                        <button
                          key={qText}
                          type="button"
                          onClick={() => void handleSend(qText)}
                          className="text-left px-3.5 py-2 bg-white border border-[#D6D1C4] hover:border-[#18181B] rounded-lg text-xs text-[#18181B] transition-colors cursor-pointer"
                        >
                          {qText}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isMine = msg.senderId === user.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm ${
                          isMine
                            ? 'bg-[#18181B] text-white'
                            : 'bg-white border border-[#E5E1D8] text-[#18181B]'
                        }`}
                      >
                        <p className="text-[11px] opacity-75 mb-1">
                          {msg.senderName} ·{' '}
                          {msg.senderRole === 'host'
                            ? t.messages.hostBadge
                            : t.messages.guestBadge}
                        </p>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                className="p-4 border-t border-[#E5E1D8] bg-white flex items-center gap-3"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t.messages.typeMessage}
                  className="flex-1 px-4 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B]"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.messages.send}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#57534E]">
              {t.messages.selectThread}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
