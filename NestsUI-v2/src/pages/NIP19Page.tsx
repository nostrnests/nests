import { nip19 } from 'nostr-tools';
import { useParams, Navigate } from 'react-router-dom';
import { ROOM_KIND } from '@/lib/const';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile':
      return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Profile view not implemented</div>;

    case 'note':
      return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Note view not implemented</div>;

    case 'nevent':
      return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Event view not implemented</div>;

    case 'naddr': {
      const data = decoded.data;
      // If it's a room event, redirect to room page
      if (data.kind === ROOM_KIND) {
        return <Navigate to={`/room/${identifier}`} replace />;
      }
      return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Addressable event view not implemented</div>;
    }

    default:
      return <NotFound />;
  }
}
