import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, type CategoryId } from "@/lib/news-types";
import { COUNTRY_OPTIONS, TOPIC_SUGGESTIONS } from "@/lib/interests";
import { useInterests } from "@/lib/use-interests";
import { Sparkles, MapPin, Tag, X, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterestsModal({ open, onOpenChange }: Props) {
  const { interests, save, skip } = useInterests();
  const [categories, setCategories] = useState<CategoryId[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [country, setCountry] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [customTopic, setCustomTopic] = useState("");

  // Hydrate from saved when modal opens.
  useEffect(() => {
    if (open) {
      setCategories(interests.categories);
      setTopics(interests.topics);
      setCountry(interests.country ?? "");
      setLocationLabel(interests.locationLabel ?? "");
    }
  }, [open, interests]);

  const toggleCategory = (id: CategoryId) => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleTopic = (t: string) => {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const addCustomTopic = () => {
    const t = customTopic.trim();
    if (!t) return;
    if (!topics.includes(t)) setTopics([...topics, t]);
    setCustomTopic("");
  };

  const handleSave = () => {
    save({
      categories,
      topics,
      country: country || null,
      locationLabel: locationLabel.trim() || null,
    });
    onOpenChange(false);
  };

  const handleSkip = () => {
    skip();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border-border bg-surface p-0">
        <div className="border-b border-border bg-surface-elevated px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="ticker-text text-[10px] uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Personalize
            </div>
            <DialogTitle className="headline text-xl font-bold sm:text-2xl">
              Make this newsroom yours
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Pick your interests and we'll tailor the feed. Skip anytime — you can reopen this from the header.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
          {/* Categories */}
          <section>
            <h3 className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Categories
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const active = categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={[
                      "px-2.5 py-1.5 text-[11px] uppercase tracking-wider border transition-colors sm:text-xs",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground",
                    ].join(" ")}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Topics */}
          <section>
            <h3 className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Hobbies, work & topics
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {TOPIC_SUGGESTIONS.map((t) => {
                const active = topics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className={[
                      "px-2.5 py-1 text-[11px] border transition-colors sm:text-xs",
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Selected custom topics */}
            {topics.filter((t) => !TOPIC_SUGGESTIONS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {topics
                  .filter((t) => !TOPIC_SUGGESTIONS.includes(t))
                  .map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] border border-accent bg-accent/10 text-accent sm:text-xs"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => toggleTopic(t)}
                        aria-label={`Remove ${t}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTopic();
                  }
                }}
                placeholder="Add your own (e.g. SaaS, Yoga, Anime)"
                className="rounded-none border-border bg-background text-sm h-9"
              />
              <Button
                type="button"
                onClick={addCustomTopic}
                variant="outline"
                className="rounded-none border-border h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* Geography */}
          <section>
            <h3 className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Geography
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-9 border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="">Any country</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Input
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="City or region (optional)"
                className="rounded-none border-border bg-background text-sm h-9"
              />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-surface-elevated px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleSkip}
            className="ticker-text text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
          <Button
            type="button"
            onClick={handleSave}
            className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 ticker-text text-[11px] uppercase tracking-widest h-9 px-4"
          >
            Save preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
