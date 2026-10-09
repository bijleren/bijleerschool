import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Shows the Videoleren app (public/videoleren/app.html) in an iframe.
 * The page reads `window.parent.videolerenHost` on load, so it uses our Supabase client:
 * teachers through their own session, students through their access_hash.
 *
 * Teachers: the app fills the dashboard below the bijleer.school header, which stays visible.
 * Students: full screen, like the rest of the public WebWijzer.
 */
type HostProps =
  | { mode: 'teacher'; taskId: string; onClose: () => void; onSaved?: () => void }
  | { mode: 'student'; hash: string; taskId?: string; shareCode?: string; onClose: () => void };

declare global {
  interface Window {
    videolerenHost?: Record<string, unknown>;
  }
}

const ALLOW = 'microphone; display-capture; clipboard-write; fullscreen; encrypted-media; autoplay';

export function VideolerenFrame(props: HostProps) {
  const propsRef = useRef(props);
  propsRef.current = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  // Set before the iframe loads; callbacks go through the ref so they stay current.
  window.videolerenHost = {
    ...props,
    supabase,
    onClose: () => propsRef.current.onClose(),
    onSaved: () => (propsRef.current as { onSaved?: () => void }).onSaved?.(),
  };

  useEffect(() => {
    if (props.mode !== 'student') return () => { delete window.videolerenHost; };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      delete window.videolerenHost;
    };
  }, [props.mode]);

  // Teacher: take exactly the space between the header and the bottom of the window.
  useLayoutEffect(() => {
    if (props.mode !== 'teacher') return;
    const fit = () => {
      const top = boxRef.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(320, window.innerHeight - Math.max(0, top + window.scrollY)));
    };
    window.scrollTo({ top: 0 });
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [props.mode]);

  const key = props.mode === 'teacher' ? props.taskId : `${props.taskId ?? props.shareCode}`;
  const frame = <iframe key={key} src="/videoleren/app.html" title="Videoleren" className="w-full h-full border-0 block" allow={ALLOW} />;

  if (props.mode === 'teacher') {
    // -m-8 cancels the dashboard's p-8 so the tool runs edge to edge under the header.
    return (
      <div ref={boxRef} className="-m-8 bg-cream" style={{ height: height ?? 'calc(100vh - 65px)' }}>
        {frame}
      </div>
    );
  }
  return <div className="fixed inset-0 z-[60] bg-cream">{frame}</div>;
}
