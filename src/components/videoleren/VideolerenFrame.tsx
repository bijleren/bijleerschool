import React, { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Shows the Videoleren app (public/videoleren/app.html) full screen in an iframe.
 * The page reads `window.parent.videolerenHost` on load, so it uses our Supabase client:
 * teachers through their own session, students through their access_hash.
 */
type HostProps =
  | { mode: 'teacher'; taskId: string; onClose: () => void; onSaved?: () => void }
  | { mode: 'student'; hash: string; taskId?: string; shareCode?: string; onClose: () => void };

declare global {
  interface Window {
    videolerenHost?: Record<string, unknown>;
  }
}

export function VideolerenFrame(props: HostProps) {
  const propsRef = useRef(props);
  propsRef.current = props;

  // Set before the iframe loads; callbacks go through the ref so they stay current.
  window.videolerenHost = {
    ...props,
    supabase,
    onClose: () => propsRef.current.onClose(),
    onSaved: () => (propsRef.current as { onSaved?: () => void }).onSaved?.(),
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      delete window.videolerenHost;
    };
  }, []);

  const key = props.mode === 'teacher' ? props.taskId : `${props.taskId ?? props.shareCode}`;

  return (
    <div className="fixed inset-0 z-[60] bg-white">
      <iframe
        key={key}
        src="/videoleren/app.html"
        title="Videoleren"
        className="w-full h-full border-0"
        allow="microphone; display-capture; clipboard-write; fullscreen; encrypted-media; autoplay"
      />
    </div>
  );
}
