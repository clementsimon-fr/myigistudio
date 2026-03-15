import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface DemoCard {
  id: string;
  name: string;
  totalSessions: number;
  usedSessions: number;
  expiresAt: string;
}

export interface DemoReservation {
  id: string;
  activityName: string;
  date: string;
  time: string;
  status: string;
  createdAt: string;
}

export interface DemoNotification {
  id: string;
  message: string;
  timestamp: string;
  type: "purchase" | "reservation" | "account";
}

export interface DemoProfile {
  id: string;
  name: string;
  role: "admin" | "client" | "visitor";
  credits: number;
  cards: DemoCard[];
  reservations: DemoReservation[];
}

const DEFAULT_PROFILES: Record<string, DemoProfile> = {
  elodie: {
    id: "elodie",
    name: "Élodie",
    role: "admin",
    credits: 0,
    cards: [],
    reservations: [],
  },
  marion: {
    id: "marion",
    name: "Marion",
    role: "client",
    credits: 0,
    cards: [],
    reservations: [],
  },
  sophie: {
    id: "sophie",
    name: "Sophie",
    role: "client",
    credits: 4,
    cards: [
      {
        id: "card-sophie-1",
        name: "Carte 10 cours Yoga",
        totalSessions: 10,
        usedSessions: 6,
        expiresAt: "2026-09-30",
      },
    ],
    reservations: [],
  },
};

interface DemoContextValue {
  currentProfile: DemoProfile | null;
  setCurrentProfile: (profile: DemoProfile | null) => void;
  demoNotifications: DemoNotification[];
  addNotification: (message: string, type: DemoNotification["type"]) => void;
  addCredits: (amount: number, cardName: string) => void;
  useCredit: () => boolean;
  addReservation: (activityName: string, date: string, time: string) => void;
  createTempProfile: (name: string) => void;
  getDefaultProfile: (id: string) => DemoProfile | undefined;
  tempProfiles: DemoProfile[];
}

const DemoContext = createContext<DemoContextValue | null>(null);

const LS_PROFILE_KEY = "demo_profile";
const LS_NOTIFS_KEY = "demo_notifications";
const LS_TEMP_PROFILES_KEY = "demo_temp_profiles";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [currentProfile, setCurrentProfileState] = useState<DemoProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LS_PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [demoNotifications, setDemoNotifications] = useState<DemoNotification[]>(() => {
    try {
      const saved = localStorage.getItem(LS_NOTIFS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [tempProfiles, setTempProfiles] = useState<DemoProfile[]>(() => {
    try {
      const saved = localStorage.getItem(LS_TEMP_PROFILES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (currentProfile) localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(currentProfile));
    else localStorage.removeItem(LS_PROFILE_KEY);
  }, [currentProfile]);

  useEffect(() => {
    localStorage.setItem(LS_NOTIFS_KEY, JSON.stringify(demoNotifications));
  }, [demoNotifications]);

  useEffect(() => {
    localStorage.setItem(LS_TEMP_PROFILES_KEY, JSON.stringify(tempProfiles));
  }, [tempProfiles]);

  const setCurrentProfile = useCallback((profile: DemoProfile | null) => {
    setCurrentProfileState(profile);
  }, []);

  const addNotification = useCallback((message: string, type: DemoNotification["type"]) => {
    const notif: DemoNotification = {
      id: crypto.randomUUID(),
      message,
      timestamp: new Date().toISOString(),
      type,
    };
    setDemoNotifications(prev => [notif, ...prev]);
  }, []);

  const addCredits = useCallback((amount: number, cardName: string) => {
    setCurrentProfileState(prev => {
      if (!prev) return prev;
      const newCard: DemoCard = {
        id: crypto.randomUUID(),
        name: cardName,
        totalSessions: amount,
        usedSessions: 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      };
      return { ...prev, credits: prev.credits + amount, cards: [...prev.cards, newCard] };
    });
  }, []);

  const useCredit = useCallback(() => {
    let success = false;
    setCurrentProfileState(prev => {
      if (!prev || prev.credits <= 0) return prev;
      const cards = [...prev.cards];
      const cardIdx = cards.findIndex(c => c.usedSessions < c.totalSessions);
      if (cardIdx >= 0) {
        cards[cardIdx] = { ...cards[cardIdx], usedSessions: cards[cardIdx].usedSessions + 1 };
      }
      success = true;
      return { ...prev, credits: prev.credits - 1, cards };
    });
    return success;
  }, []);

  const addReservation = useCallback((activityName: string, date: string, time: string) => {
    const res: DemoReservation = {
      id: crypto.randomUUID(),
      activityName,
      date,
      time,
      status: "confirmé",
      createdAt: new Date().toISOString(),
    };
    setCurrentProfileState(prev => {
      if (!prev) return prev;
      return { ...prev, reservations: [res, ...prev.reservations] };
    });
  }, []);

  const createTempProfile = useCallback((name: string) => {
    const profile: DemoProfile = {
      id: `temp-${Date.now()}`,
      name,
      role: "client",
      credits: 0,
      cards: [],
      reservations: [],
    };
    setCurrentProfileState(profile);
    setTempProfiles(prev => {
      // Avoid duplicates by name
      if (prev.some(p => p.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, profile];
    });
    addNotification(`${name} a créé un compte`, "account");
  }, [addNotification]);

  const getDefaultProfile = useCallback((id: string) => {
    return DEFAULT_PROFILES[id] ? { ...DEFAULT_PROFILES[id], cards: DEFAULT_PROFILES[id].cards.map(c => ({ ...c })), reservations: [] } : undefined;
  }, []);

  return (
    <DemoContext.Provider value={{
      currentProfile, setCurrentProfile, demoNotifications, addNotification,
      addCredits, useCredit, addReservation, createTempProfile, getDefaultProfile, tempProfiles,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemoContext must be used within DemoProvider");
  return ctx;
}
