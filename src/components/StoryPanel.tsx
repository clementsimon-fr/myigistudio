import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StoryChapter {
  id: string;
  sort_order: number;
  photo_url: string | null;
  title: string;
  content: string;
}

interface StoryPanelProps {
  open: boolean;
  onClose: () => void;
}

const PLACEHOLDER_IMG = "/placeholder.svg";

export default function StoryPanel({ open, onClose }: StoryPanelProps) {
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("story_chapters")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setChapters((data as any) || []);
        setIndex(0);
        setLoading(false);
      });
  }, [open]);

  const current = chapters[index];
  const total = chapters.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="story-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/40"
          onClick={onClose}
        >
          <motion.div
            key="story-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col"
          >
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur flex items-center justify-between p-4 border-b">
              <h2 className="font-display font-bold text-primary-dark flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> L'histoire d'Elodie
              </h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Chargement…</div>
              ) : total === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  Aucun chapitre pour le moment.
                </div>
              ) : current ? (
                <div className="p-6 space-y-5 max-w-md mx-auto">
                  <img
                    src={current.photo_url || PLACEHOLDER_IMG}
                    alt={current.title}
                    className="w-full h-56 rounded-2xl object-cover"
                  />
                  <h3 className="text-2xl font-display font-bold text-primary-dark">
                    {current.title}
                  </h3>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {current.content}
                  </p>
                </div>
              ) : null}
            </div>

            {total > 1 && (
              <div className="border-t bg-background p-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-xs text-muted-foreground">
                  {index + 1} / {total}
                </span>
                <button
                  onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={index === total - 1}
                  className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
