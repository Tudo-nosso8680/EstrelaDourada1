import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';

export type OnlineUser = {
  user_id: string;
  nome_completo: string;
  sector: string | null;
  last_heartbeat: string;
};

const HEARTBEAT_INTERVAL = 30_000;
const ONLINE_WINDOW_MINUTES = 2;

export function usePresence(userProfile: UserProfile | null) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = userProfile;

  const updateHeartbeat = useCallback(async () => {
    const profile = profileRef.current;
    if (!profile) return;
    await supabase.from('presenca').upsert({
      user_id: profile.id,
      nome_completo: profile.nome_completo,
      sector: profile.sector,
      last_heartbeat: new Date().toISOString(),
    });
  }, []);

  const fetchOnline = useCallback(async () => {
    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('presenca')
      .select('user_id, nome_completo, sector, last_heartbeat')
      .gte('last_heartbeat', cutoff)
      .order('nome_completo', { ascending: true });
    if (data) setOnlineUsers(data as OnlineUser[]);
  }, []);

  useEffect(() => {
    let heartbeatTimer: number | null = null;
    let fetchTimer: number | null = null;

    async function start() {
      if (!profileRef.current) return;
      await updateHeartbeat();
      await fetchOnline();
      heartbeatTimer = window.setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);
      fetchTimer = window.setInterval(fetchOnline, HEARTBEAT_INTERVAL);
    }

    function stop() {
      if (heartbeatTimer) { window.clearInterval(heartbeatTimer); heartbeatTimer = null; }
      if (fetchTimer) { window.clearInterval(fetchTimer); fetchTimer = null; }
    }

    void start();

    const handleUnload = () => {
      const profile = profileRef.current;
      if (profile) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL}/rest/v1/presenca?user_id=eq.${profile.id}`,
          '',
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      stop();
      window.removeEventListener('beforeunload', handleUnload);
      const profile = profileRef.current;
      if (profile) {
        void supabase.from('presenca').delete().eq('user_id', profile.id);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return onlineUsers;
}
