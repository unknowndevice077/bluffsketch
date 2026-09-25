import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TEXT_LIMITS } from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { sendChat } from '../lib/net';
import { useGame } from '../store/gameStore';

interface ChatProps {
  enabled: boolean;
  className?: string;
}

export function Chat({ enabled, className }: ChatProps) {
  const messages = useGame((s) => s.chat);
  const players = useGame((s) => s.room?.players ?? []);
  const myId = useGame((s) => s.room?.you.playerId);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !enabled) return;
    sendChat(text);
    setDraft('');
  };

  return (
    <section className={cn('card-sketch flex min-h-[260px] flex-col p-3', className)} aria-label="Chat">
      <h2 className="mb-1 text-2xl">Chat</h2>
      <ol ref={listRef} role="log" aria-live="polite" className="scrollbar-thin flex-1 space-y-1 overflow-y-auto pr-1">
        {messages.length === 0 && <li className="text-muted">No messages yet. Say hi!</li>}
        {messages.map((message) => {
          const author = players.find((p) => p.id === message.playerId);
          return (
            <li key={message.id} className={cn('break-words leading-snug', message.system && 'text-sm italic text-muted')}>
              {!message.system && (
                <span className={cn('mr-1 font-bold', message.playerId === myId && 'text-accent')}>
                  {author ? author.name : message.name}:
                </span>
              )}
              {message.text}
            </li>
          );
        })}
      </ol>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          className="input-sketch !text-lg"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={TEXT_LIMITS.chatMax}
          disabled={!enabled}
          placeholder={enabled ? 'Type a message…' : 'Chat is paused during the round'}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-secondary" disabled={!enabled || !draft.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
