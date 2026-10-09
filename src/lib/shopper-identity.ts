/** Pure shopper identity helpers (client-safe — no server imports). */

export type AuthProvider = "google" | "email";

interface AuthUserLike {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export function providerOf(user: AuthUserLike | null | undefined): AuthProvider {
  const providers = (user?.app_metadata as { providers?: string[] } | undefined)?.providers ?? [];
  return providers.includes("google") ? "google" : "email";
}

/** profiles.avatar_url wins (user upload); Google avatar/picture is fallback. */
export function avatarOf(
  user: AuthUserLike | null | undefined,
  profile?: { avatar_url?: string | null } | null,
): string | null {
  if (profile?.avatar_url) return profile.avatar_url;
  const meta = (user?.user_metadata ?? {}) as { avatar_url?: string; picture?: string };
  return meta.avatar_url || meta.picture || null;
}

export function displayNameOf(user: AuthUserLike | null | undefined): string {
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  return meta.full_name || meta.name || (user?.email ?? "").split("@")[0] || "";
}

export function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  return displayNameOf(user);
}
