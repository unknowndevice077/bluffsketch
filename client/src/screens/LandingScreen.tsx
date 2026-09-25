import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AVATAR_IDS,
  ROOM_CODE_LENGTH,
  TEXT_LIMITS,
  type AvatarId,
  type PublicRoomInfo,
} from '@bluffsketch/shared';
import { Avatar } from '../components/Avatar';
import { HowToPlay } from '../components/HowToPlay';
import { Logo } from '../components/Logo';
import { cn } from '../lib/cn';
import { createRoom, joinRoom, listPublicRooms } from '../lib/net';
import { loadProfile, saveProfile } from '../lib/session';
import { sound } from '../lib/sound';
import { useGame } from '../store/gameStore';

const randomAvatar = (): AvatarId => AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];

export function LandingScreen() {
  const pendingCode = useGame((s) => s.pendingCode);
  const connected = useGame((s) => s.connection === 'connected');
  const [saved] = useState(loadProfile);
  const [name, setName] = useState(saved?.name ?? '');
  const [avatar, setAvatar] = useState<AvatarId>(saved?.avatar ?? randomAvatar());
  const [code, setCode] = useState(pendingCode ?? '');
  const [nameError, setNameError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [rooms, setRooms] = useState<PublicRoomInfo[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingCode) setCode(pendingCode);
  }, [pendingCode]);

  const refreshRooms = useCallback(async () => setRooms(await listPublicRooms()), []);
  useEffect(() => {
    if (connected) void refreshRooms();
  }, [connected, refreshRooms]);

  const ensureName = (): boolean => {
    sound.unlock();
    if (name.trim().length === 0) {
      setNameError(true);
      nameRef.current?.focus();
      return false;
    }
    saveProfile({ name: name.trim(), avatar });
    return true;
  };

  const onCreate = async () => {
    if (!ensureName()) return;
    setBusy(true);
    await createRoom(name.trim(), avatar);
    setBusy(false);
  };

  const onJoin = async (roomCode: string) => {
    if (!ensureName()) return;
    setBusy(true);
    await joinRoom(roomCode.toUpperCase(), name.trim(), avatar);
    setBusy(false);
  };

  const submitJoin = (event: FormEvent) => {
    event.preventDefault();
    if (code.length === ROOM_CODE_LENGTH) void onJoin(code);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 pb-16 pt-4">
      <div className="text-center">
        <Logo />
        <p className="mt-2 font-hand text-2xl text-muted">Everyone draws the secret word. One of you is faking it.</p>
      </div>

      <div className="grid w-full gap-6 md:grid-cols-2">
        <motion.section
          className="card-sketch relative p-5"
          initial={{ rotate: -1.5, y: 20, opacity: 0 }}
          animate={{ rotate: -1, y: 0, opacity: 1 }}
          aria-labelledby="profile-heading"
        >
          <span className="tape" aria-hidden />
          <h2 id="profile-heading" className="text-3xl">
            Who are you?
          </h2>
          <label htmlFor="player-name" className="label-hand mt-3 block">
            Your name
          </label>
          <input
            ref={nameRef}
            id="player-name"
            className={cn('input-sketch mt-1', nameError && '!border-danger')}
            value={name}
            maxLength={TEXT_LIMITS.nameMax}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(false);
            }}
            placeholder="Doodle McDoodleface"
            autoComplete="nickname"
            aria-invalid={nameError}
            aria-describedby={nameError ? 'name-error' : undefined}
          />
          {nameError && (
            <p id="name-error" className="mt-1 text-danger" role="alert">
              Pick a name first!
            </p>
          )}
          <p className="label-hand mt-4">Pick a doodle</p>
          <div className="mt-1 grid grid-cols-6 gap-2" role="radiogroup" aria-label="Avatar">
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={avatar === id}
                aria-label={id}
                onClick={() => setAvatar(id)}
                className={cn(
                  'flex aspect-square min-h-[44px] items-center justify-center rounded-xl border-[3px] transition-transform',
                  avatar === id ? 'scale-110 border-ink bg-sun shadow-sketch-sm' : 'border-transparent hover:rotate-6',
                )}
              >
                <Avatar id={id} size={44} />
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="card-sketch flex flex-col gap-4 p-5"
          initial={{ rotate: 1.5, y: 20, opacity: 0 }}
          animate={{ rotate: 1, y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          aria-labelledby="play-heading"
        >
          <h2 id="play-heading" className="text-3xl">
            Let&apos;s play
          </h2>
          <button type="button" className="btn btn-primary w-full !text-2xl" onClick={onCreate} disabled={busy || !connected}>
            ✏️ Create a room
          </button>
          <div className="flex items-center gap-3 text-muted">
            <span className="h-0.5 flex-1 bg-ink/20" />
            <span className="font-hand text-lg">or join one</span>
            <span className="h-0.5 flex-1 bg-ink/20" />
          </div>
          <form onSubmit={submitJoin} className="flex gap-2">
            <label htmlFor="room-code" className="sr-only">
              Room code
            </label>
            <input
              id="room-code"
              className="input-sketch text-center font-display !text-3xl uppercase tracking-[0.3em]"
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="CODE"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-secondary" disabled={busy || !connected || code.length !== ROOM_CODE_LENGTH}>
              Join
            </button>
          </form>
          {pendingCode && <p className="font-hand text-lg text-accent">You were invited to room {pendingCode}. Pick a name and hit Join!</p>}

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl">Public rooms</h3>
              <button type="button" className="btn btn-ghost !px-3 !text-base" onClick={() => void refreshRooms()} disabled={!connected}>
                ↻ Refresh
              </button>
            </div>
            {rooms.length === 0 ? (
              <p className="mt-1 text-muted">No open public rooms right now. Start one!</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {rooms.map((room) => (
                  <li key={room.code} className="flex items-center justify-between gap-2 rounded-xl border-2 border-ink/40 px-3 py-1">
                    <span className="min-w-0 truncate font-hand text-lg">
                      {room.hostName}&apos;s room · {room.playerCount}/{room.maxPlayers}
                    </span>
                    <button type="button" className="btn btn-mint !text-base" onClick={() => void onJoin(room.code)} disabled={busy}>
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" className="btn btn-ghost mt-auto" onClick={() => setHowOpen(true)}>
            ❓ How to play
          </button>
        </motion.section>
      </div>
      <HowToPlay open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
}
