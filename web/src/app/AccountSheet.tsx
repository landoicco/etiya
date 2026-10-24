import type { User } from "@/auth/auth";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { initialOf } from "./greeting";

interface Props {
  user: User;
  // The queue does not know whose workouts it holds: whoever signs in next would send them
  // as their own
  canSignOut: boolean;
  onSignOut: () => void;
  onClose: () => void;
}

export function AccountSheet({ user, canSignOut, onSignOut, onClose }: Props) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-soft text-lg font-bold text-accent-ink">
          {initialOf(user)}
        </span>
        <div className="min-w-0">
          {user.name && <p className="truncate text-lg font-bold">{user.name}</p>}
          <p className="truncate text-sm text-muted">{user.email ?? "Offline"}</p>
        </div>
      </div>

      <Button variant="secondary" icon="signOut" onClick={onSignOut} disabled={!canSignOut} className="mt-5">
        Sign out
      </Button>
      {!canSignOut && (
        <p className="mt-2 pb-2 text-center text-sm text-muted">Sign out once your workouts are sent</p>
      )}
    </BottomSheet>
  );
}
