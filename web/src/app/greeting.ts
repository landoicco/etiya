import type { User } from "@/auth/auth";

// By the phone's clock: morning from 5, afternoon from noon, evening from 7 PM
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }
  if (hour >= 12 && hour < 19) {
    return "Good afternoon";
  }
  return "Good evening";
}

// For the avatar: the name's first letter, or the email's for a user without one
export function initialOf(user: User): string {
  return (user.name ?? user.email ?? "").trim().charAt(0).toUpperCase();
}
