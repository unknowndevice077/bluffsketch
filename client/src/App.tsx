import { MotionConfig, motion } from 'framer-motion';
import type { ReactElement } from 'react';
import type { Phase } from '@bluffsketch/shared';
import { ConnectionBanner } from './components/ConnectionBanner';
import { LiveAnnouncer } from './components/LiveAnnouncer';
import { Toasts } from './components/Toasts';
import { TopBar } from './components/TopBar';
import { useApplyPrefs, useMusicDirector, usePhaseEffects } from './hooks/useAppEffects';
import { useReducedMotion } from './hooks/useReducedMotion';
import { DrawingScreen } from './screens/DrawingScreen';
import { FinalResultsScreen } from './screens/FinalResultsScreen';
import { GalleryScreen } from './screens/GalleryScreen';
import { LandingScreen } from './screens/LandingScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { RevealScreen } from './screens/RevealScreen';
import { RoleRevealScreen } from './screens/RoleRevealScreen';
import { RoundResultsScreen } from './screens/RoundResultsScreen';
import { StatusScreen } from './screens/StatusScreen';
import { VotingScreen } from './screens/VotingScreen';
import { useGame } from './store/gameStore';

const SCREENS: Record<Phase, () => ReactElement | null> = {
  LOBBY: LobbyScreen,
  ROLE_REVEAL: RoleRevealScreen,
  DRAWING: DrawingScreen,
  GALLERY_REVIEW: GalleryScreen,
  VOTING: VotingScreen,
  REVEAL: RevealScreen,
  FAKER_LAST_CHANCE: RevealScreen,
  ROUND_RESULTS: RoundResultsScreen,
  FINAL_RESULTS: FinalResultsScreen,
};

function CurrentScreen() {
  const error = useGame((s) => s.error);
  const phase = useGame((s) => s.room?.phase);
  const round = useGame((s) => s.room?.round ?? 0);

  let key: string;
  let screen: ReactElement;
  if (error) {
    key = `error-${error.kind}`;
    screen = <StatusScreen error={error} />;
  } else if (!phase) {
    key = 'landing';
    screen = <LandingScreen />;
  } else {
    const Screen = SCREENS[phase];
    // Reveal and last chance share one screen so the stage does not flash between them.
    key = `${phase === 'FAKER_LAST_CHANCE' ? 'REVEAL' : phase}-${round}`;
    screen = <Screen />;
  }

  // Enter-only transition. An exit animation with AnimatePresence mode="wait" can stall
  // when phases change in quick succession, leaving a blank screen, which a game can't afford.
  return (
    <motion.main
      key={key}
      id="main"
      className="flex w-full flex-1 flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {screen}
    </motion.main>
  );
}

export function App() {
  useApplyPrefs();
  usePhaseEffects();
  useMusicDirector();
  const reduced = useReducedMotion();

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:p-2">
        Skip to content
      </a>
      <div className="flex min-h-dvh flex-col">
        <TopBar />
        <CurrentScreen />
      </div>
      <Toasts />
      <ConnectionBanner />
      <LiveAnnouncer />
    </MotionConfig>
  );
}
