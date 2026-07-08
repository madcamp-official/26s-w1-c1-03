// ─── Types ────────────────────────────────────────────────────────────────────
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type AuthPhase = "login" | "change-password" | "profile-setup";
export type MainScreen = "pokedex" | "teams" | "evaluate" | "ai-analysis" | "compare" | "profile";
export interface Stats { attack: number; defense: number; agility: number; teamwork: number; mana: number; health: number; }
export interface TitleVote { title: string; votes: number; }
export interface User { id: number; name: string; role: string; photo: string; bio: string; stats: Stats; titleVotes: TitleVote[]; rarity: Rarity; isUnlocked?: boolean; remainingCount?: number; registered?: boolean; }
export interface ChatMessage { role: "user" | "ai"; text: string; }
