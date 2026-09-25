import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CATEGORIES,
  CATEGORY_IDS,
  SETTINGS_BOUNDS,
  TEXT_LIMITS,
  type CategoryId,
  type DifficultySetting,
  type GameSettings,
  type SettingsPatch,
} from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { updateSettings } from '../lib/net';
import { Segmented, Stepper, Toggle } from './ui/Controls';

interface SettingsPanelProps {
  settings: GameSettings;
  customPairCount: number;
  isHost: boolean;
  playerCount: number;
}

/** Sliders fire continuously; batch them so we stay under the server rate limit. */
function useDebouncedPatch(delayMs = 250) {
  const pending = useRef<SettingsPatch>({});
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (patch: SettingsPatch) => {
    pending.current = { ...pending.current, ...patch };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const toSend = pending.current;
      pending.current = {};
      void updateSettings(toSend);
    }, delayMs);
  };
}

function RangeSetting({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const id = `range-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-hand text-xl">
          {label}
        </label>
        <span className="font-display text-2xl">{local}s</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          setLocal(next);
          onChange(next);
        }}
        className="h-11 w-full"
      />
    </div>
  );
}

function CustomPairs({ settings, onChange }: { settings: GameSettings; onChange: (patch: SettingsPatch) => void }) {
  const [real, setReal] = useState('');
  const [fake, setFake] = useState('');
  const pairs = settings.customPairs;
  const canAdd =
    real.trim().length > 0 &&
    fake.trim().length > 0 &&
    real.trim().toLowerCase() !== fake.trim().toLowerCase() &&
    pairs.length < TEXT_LIMITS.customPairsMax;

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!canAdd) return;
    onChange({ customPairs: [...pairs, { real: real.trim(), fake: fake.trim() }] });
    setReal('');
    setFake('');
  };

  return (
    <div className="space-y-2">
      <p className="font-hand text-xl">Custom word pairs</p>
      <p className="text-sm text-muted">Only you can see these. They are played before the built-in words.</p>
      <form onSubmit={add} className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input
          className="input-sketch !text-lg"
          placeholder="Real word"
          aria-label="Real word"
          value={real}
          maxLength={TEXT_LIMITS.wordMax}
          onChange={(event) => setReal(event.target.value)}
        />
        <input
          className="input-sketch !text-lg"
          placeholder="Faker word"
          aria-label="Faker word"
          value={fake}
          maxLength={TEXT_LIMITS.wordMax}
          onChange={(event) => setFake(event.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={!canAdd} aria-label="Add word pair">
          +
        </button>
      </form>
      {pairs.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {pairs.map((pair, index) => (
            <li key={`${pair.real}-${pair.fake}-${index}`} className="chip bg-card !min-h-0 !py-0.5 !text-base">
              {pair.real} / {pair.fake}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent/20"
                aria-label={`Remove ${pair.real} and ${pair.fake}`}
                onClick={() => onChange({ customPairs: pairs.filter((_, i) => i !== index) })}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SettingsPanel({ settings, customPairCount, isHost, playerCount }: SettingsPanelProps) {
  const debounced = useDebouncedPatch();
  const send = (patch: SettingsPatch) => void updateSettings(patch);
  const disabled = !isHost;

  const toggleCategory = (id: CategoryId) => {
    const has = settings.categories.includes(id);
    const next = has ? settings.categories.filter((c) => c !== id) : [...settings.categories, id];
    send({ categories: next });
  };

  return (
    <section className="card-sketch relative space-y-4 p-4" aria-label="Game settings">
      <span className="tape" aria-hidden />
      <div className="flex items-baseline justify-between">
        <h2 className="text-3xl">Settings</h2>
        {!isHost && <span className="label-hand">The host picks these</span>}
      </div>

      <Stepper
        label="Rounds"
        value={settings.rounds}
        min={SETTINGS_BOUNDS.rounds.min}
        max={SETTINGS_BOUNDS.rounds.max}
        onChange={(rounds) => send({ rounds })}
        disabled={disabled}
      />
      <RangeSetting
        label="Draw time"
        value={settings.drawTimeSec}
        min={SETTINGS_BOUNDS.drawTimeSec.min}
        max={SETTINGS_BOUNDS.drawTimeSec.max}
        step={5}
        disabled={disabled}
        onChange={(drawTimeSec) => debounced({ drawTimeSec })}
      />
      <RangeSetting
        label="Vote time"
        value={settings.voteTimeSec}
        min={SETTINGS_BOUNDS.voteTimeSec.min}
        max={SETTINGS_BOUNDS.voteTimeSec.max}
        step={5}
        disabled={disabled}
        onChange={(voteTimeSec) => debounced({ voteTimeSec })}
      />

      <div>
        <p className="font-hand text-xl">Categories</p>
        <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Categories">
          {CATEGORY_IDS.map((id) => {
            const active = settings.categories.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => toggleCategory(id)}
                className={cn('chip !text-base disabled:cursor-default', active ? 'bg-sky/80 text-[#0f2a3f]' : 'bg-card opacity-70')}
              >
                <span aria-hidden>{CATEGORIES[id].emoji}</span>
                {CATEGORIES[id].label}
              </button>
            );
          })}
        </div>
        {settings.categories.length === 0 && <p className="mt-1 text-sm text-muted">None selected: all categories will be used.</p>}
      </div>

      <Segmented<DifficultySetting>
        label="Difficulty"
        value={settings.difficulty}
        disabled={disabled}
        onChange={(difficulty) => send({ difficulty })}
        options={[
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard' },
          { value: 'mixed', label: 'Mixed' },
        ]}
      />

      <div className="space-y-1">
        <Toggle
          label="Faker knows they're the Faker"
          description="Off: nobody knows their role, not even the Faker."
          checked={settings.fakerKnows}
          disabled={disabled}
          onChange={(fakerKnows) => send({ fakerKnows })}
        />
        <Toggle
          label="Ink limit"
          description="Limited ink per round. Make every line count."
          checked={settings.inkLimit}
          disabled={disabled}
          onChange={(inkLimit) => send({ inkLimit })}
        />
        <Toggle
          label="Blind draw"
          description="You only see your own lines until time is up."
          checked={settings.blindDraw}
          disabled={disabled}
          onChange={(blindDraw) => send({ blindDraw })}
        />
        <Toggle
          label="Public room"
          description="List this room on the home page."
          checked={settings.isPublic}
          disabled={disabled}
          onChange={(isPublic) => send({ isPublic })}
        />
      </div>

      <Stepper
        label="Max players"
        value={settings.maxPlayers}
        min={Math.max(SETTINGS_BOUNDS.maxPlayers.min, playerCount)}
        max={SETTINGS_BOUNDS.maxPlayers.max}
        onChange={(maxPlayers) => send({ maxPlayers })}
        disabled={disabled}
      />

      {isHost ? (
        <CustomPairs settings={settings} onChange={send} />
      ) : (
        customPairCount > 0 && (
          <p className="font-hand text-lg">
            ✏️ The host added {customPairCount} custom word pair{customPairCount === 1 ? '' : 's'}.
          </p>
        )
      )}
    </section>
  );
}
