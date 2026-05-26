"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useXP } from "@/lib/xpContext";

const CARDS = [
  {
    icon: "🎓",
    title: "Why you learned this first",
    color: "from-violet-900/40 to-violet-950/20",
    border: "border-violet-700/30",
    accent: "text-violet-400",
    body: "Bubble sort is the simplest way to understand comparison-based sorting. It makes the core idea obvious — bigger elements \"bubble\" to the top. Once you get this, merge sort and quick sort click faster.",
    tag: "Foundation",
  },
  {
    icon: "📡",
    title: "Where it actually runs",
    color: "from-cyan-900/40 to-cyan-950/20",
    border: "border-cyan-700/30",
    accent: "text-cyan-400",
    body: "Embedded systems with tiny datasets. Sorting a handful of sensor readings on a microcontroller. Nearly-sorted data where it runs close to O(n). Educational tools, obviously. Anywhere n is so small that simplicity beats performance.",
    tag: "Real Usage",
  },
  {
    icon: "📊",
    title: "Why it's slow",
    color: "from-amber-900/40 to-amber-950/20",
    border: "border-amber-700/30",
    accent: "text-amber-400",
    body: "O(n²) time complexity. Sort 100 elements: up to 10,000 comparisons. Sort 10,000 elements: up to 100 million comparisons. Merge sort does the same job in ~130,000. The gap only gets worse as n grows.",
    tag: "Complexity",
    extra: (
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { n: "100", bubble: "10K", merge: "665" },
          { n: "1,000", bubble: "500K", merge: "10K" },
          { n: "10,000", bubble: "50M", merge: "133K" },
        ].map((row) => (
          <div key={row.n} className="bg-[#0a0a14]/60 rounded-lg p-2">
            <p className="text-slate-300 font-bold text-sm">{row.n}</p>
            <p className="text-red-400 text-xs mt-0.5">🫧 {row.bubble}</p>
            <p className="text-emerald-400 text-xs">⚡ {row.merge}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: "🚀",
    title: "What comes next",
    color: "from-emerald-900/40 to-emerald-950/20",
    border: "border-emerald-700/30",
    accent: "text-emerald-400",
    body: "Selection sort and insertion sort are next. Then merge sort — where you'll see O(n log n) for the first time. Then quicksort, the one actually used in most languages' standard libraries.",
    tag: "Learning Path",
    extra: (
      <div className="mt-4 flex gap-2 flex-wrap">
        {[
          { name: "Selection Sort", done: true },
          { name: "Insertion Sort", done: false },
          { name: "Merge Sort", done: false },
          { name: "Quick Sort", done: false },
        ].map((item) => (
          <span
            key={item.name}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              item.done
                ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700/40"
                : "bg-[#1c1c3a] text-slate-500 border border-[#2a2a4a]"
            }`}
          >
            {item.done ? "✓ " : ""}
            {item.name}
          </span>
        ))}
      </div>
    ),
  },
];

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function Section6RealWorld() {
  const { goToSection, totalSessionXP, sessionStartTime, sessionAccuracy, bestAccuracy } = useXP();
  const [elapsed, setElapsed] = useState(Date.now() - sessionStartTime);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - sessionStartTime), 1000);
    return () => clearInterval(t);
  }, [sessionStartTime]);

  return (
    <section className="min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-3xl w-full">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase bg-slate-900/60 px-2 py-0.5 rounded">
              06 / 06
            </span>
            <span className="text-[10px] text-slate-600">5 min</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-3 leading-tight">
            The bigger picture.
          </h2>
          <p className="text-slate-400 text-sm max-w-lg">
            Bubble sort isn&apos;t something you&apos;ll write in production. It&apos;s
            something you understand so everything else makes sense.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 border ${card.border}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
                <span
                  className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded ${card.accent} bg-black/30`}
                >
                  {card.tag}
                </span>
              </div>
              <h3 className={`text-base font-black mb-2 ${card.accent}`}>
                {card.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{card.body}</p>
              {card.extra && card.extra}
            </motion.div>
          ))}
        </div>

        {/* Performance summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-[#12121a] rounded-2xl border border-[#1c1c3a] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-black text-base">Your session</h3>
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded">
              Stats
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: "⚡",
                val: `${totalSessionXP} XP`,
                label: "earned today",
                color: "text-amber-400",
              },
              {
                icon: "⏱️",
                val: formatTime(elapsed),
                label: "time spent",
                color: "text-cyan-400",
              },
              {
                icon: "🎯",
                val: sessionAccuracy !== null ? `${sessionAccuracy}%` : "—",
                label: "boss accuracy",
                color: "text-violet-400",
              },
              {
                icon: "🏆",
                val: bestAccuracy > 0 ? `${bestAccuracy}%` : "—",
                label: "personal best",
                color: "text-emerald-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-[#1c1c3a]/60 rounded-xl p-3 text-center"
              >
                <p className="text-base mb-1">{s.icon}</p>
                <p className={`font-black text-base tabular-nums ${s.color}`}>
                  {s.val}
                </p>
                <p className="text-slate-600 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Final win */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 p-8 bg-gradient-to-r from-violet-950/60 to-cyan-950/40 rounded-3xl border border-violet-700/30 text-center"
        >
          <div className="text-5xl mb-4">🏁</div>
          <h3 className="text-2xl font-black text-white mb-2">
            Module complete.
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            You watched it, drove it, raced it, debugged it, and owned it. Bubble sort
            is yours. On to the next one.
          </p>
          <p className="text-slate-600 text-xs mb-6">
            Come back tomorrow. Daily challenge drops at midnight.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => goToSection(0)}
              className="px-5 py-2.5 bg-[#1c1c3a] hover:bg-[#252550] text-white font-bold rounded-xl transition-all border border-[#2a2a4a] text-sm"
            >
              ↺ Replay module
            </button>
            <button
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-black rounded-xl transition-all active:scale-95 text-sm shadow-lg"
              onClick={() => {
                const text = `Just completed Bubble Sort on Brainrot — ${totalSessionXP} XP, ${sessionAccuracy ?? "?"}% accuracy. Rot smarter.`;
                navigator.clipboard?.writeText(text);
              }}
            >
              Share result →
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
