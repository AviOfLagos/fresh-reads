-- Evidence submitted by users to support or fact-check an article
CREATE TABLE public.article_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  author_display TEXT NOT NULL CHECK (char_length(author_display) BETWEEN 1 AND 60),
  kind TEXT NOT NULL CHECK (kind IN ('text', 'image_url', 'source_url')),
  body TEXT CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 2000),
  image_url TEXT CHECK (image_url IS NULL OR char_length(image_url) <= 2048),
  source_url TEXT CHECK (source_url IS NULL OR char_length(source_url) <= 2048),
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_article_evidence_article ON public.article_evidence(article_id, created_at DESC);

ALTER TABLE public.article_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read non-hidden evidence"
  ON public.article_evidence FOR SELECT
  USING (hidden = false);

CREATE POLICY "Authenticated users submit their own evidence"
  ON public.article_evidence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evidence"
  ON public.article_evidence FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can hide any evidence"
  ON public.article_evidence FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role));

-- AI chat messages stored per (user, article, session)
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_session ON public.ai_chat_messages(user_id, article_id, session_id, created_at);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own AI chats"
  ON public.ai_chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own AI chats"
  ON public.ai_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own AI chats"
  ON public.ai_chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);