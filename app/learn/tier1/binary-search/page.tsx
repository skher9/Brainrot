'use client';
import { useState, useEffect } from 'react';
import BinarySearchHub from '@/components/games/tier1/binary-search/BinarySearchHub';
import IntroAnimation from '@/components/games/tier1/binary-search/IntroAnimation';
import PatternMastered from '@/components/games/tier1/binary-search/PatternMastered';
import { createClient } from '@/lib/supabase/client';
import { BS_PROBLEMS } from '@/components/games/tier1/binary-search/problems';

const FREE_COUNT = BS_PROBLEMS.filter(p => p.free).length;

export default function BinarySearchPage() {
  const [showIntro, setShowIntro] = useState(false);
  const [showMastered, setShowMastered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('bs_intro_seen');
    if (!seen) setShowIntro(true);
  }, []);

  useEffect(() => {
    if (showIntro || showMastered) return;
    // check if all free problems solved
    async function check() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const alreadyShown = localStorage.getItem('bs_mastered_seen');
        if (alreadyShown) return;

        const { data: probs } = await supabase
          .from('problems')
          .select('id, order_index')
          .eq('pattern_slug', 'binary-search')
          .lte('order_index', FREE_COUNT);

        if (!probs || probs.length < FREE_COUNT) return;

        const ids = probs.map((p: { id: string }) => p.id);
        const { data: atts } = await supabase
          .from('user_problem_attempts')
          .select('problem_id, solved')
          .eq('user_id', user.id)
          .in('problem_id', ids);

        const solvedCount = atts?.filter((a: { solved: boolean }) => a.solved).length ?? 0;
        if (solvedCount >= FREE_COUNT) {
          setShowMastered(true);
        }
      } catch {
        // fail silently
      }
    }
    check();
  }, [showIntro, showMastered]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <BinarySearchHub />
      </div>

      {showIntro && (
        <IntroAnimation
          onDone={() => {
            if (typeof window !== 'undefined') localStorage.setItem('bs_intro_seen', '1');
            setShowIntro(false);
          }}
        />
      )}

      <PatternMastered
        visible={showMastered}
        onContinue={() => {
          if (typeof window !== 'undefined') localStorage.setItem('bs_mastered_seen', '1');
          setShowMastered(false);
        }}
      />
    </div>
  );
}
