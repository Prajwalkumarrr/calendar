'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { CommandPaletteProto, type Cmd } from '@/app/calendar/CommandPaletteProto';

type CmdKCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Pages can call this to inject extra commands (e.g., calendar-specific). Returns a cleanup fn. */
  registerCommands: (key: string, cmds: Cmd[]) => () => void;
};

const Ctx = createContext<CmdKCtx>({
  open: false,
  setOpen: () => {},
  registerCommands: () => () => {},
});

export function useCmdK() {
  return useContext(Ctx);
}

function useGlobalToggle(onToggle: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onToggle();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle]);
}

export function CmdKProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Map of key → Cmd[] so multiple pages can inject without clobbering each other
  const [extras, setExtras] = useState<Record<string, Cmd[]>>({});

  const toggle = useCallback(() => setOpen((o) => !o), []);
  useGlobalToggle(toggle);

  const registerCommands = useCallback((key: string, cmds: Cmd[]) => {
    setExtras((prev) => ({ ...prev, [key]: cmds }));
    return () => setExtras((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const globalCmds: Cmd[] = [
    { section: 'Actions', id: 'g-cal',      label: 'Go to calendar',       icon: 'cal',  run: () => router.push('/calendar') },
    { section: 'Actions', id: 'g-sched',    label: 'Scheduling links',      icon: 'link', run: () => router.push('/scheduling') },
    { section: 'Actions', id: 'g-settings', label: 'Settings',              icon: 'set',  run: () => router.push('/settings') },
    { section: 'Actions', id: 'g-home',     label: 'Home',                  icon: 'cal',  run: () => router.push('/home') },
    { section: 'Actions', id: 'g-signout',  label: 'Sign out',              icon: 'set',  run: () => signOut({ callbackUrl: '/' }) },
  ];

  const extraCmds = Object.values(extras).flat();
  const allCmds = extraCmds.length > 0 ? [...extraCmds, ...globalCmds] : globalCmds;

  return (
    <Ctx.Provider value={{ open, setOpen, registerCommands }}>
      {children}
      <CommandPaletteProto
        open={open}
        onClose={() => setOpen(false)}
        commands={allCmds}
      />
    </Ctx.Provider>
  );
}
