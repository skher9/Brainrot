"use client";

// Named wrappers around sound primitives.
// Mute is handled by setSoundEnabled in xpContext — no extra check needed here.
import { sound } from "@/lib/sound";

export function correctSound()    { sound.correct(); }
export function wrongSound()      { sound.wrong(); }
export function completionSound() { sound.win(); }
export function swapSound()       { sound.swap(); }
export function compareSound()    { sound.compare(); }
export function tickSound()       { sound.tick(); }
export function xpSound()         { sound.xp(); }
export function dingSound()       { sound.ding(); }
