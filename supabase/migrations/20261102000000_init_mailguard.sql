-- ==============================================================================
-- MailGuard AI Database Schema & Row Level Security (RLS) Policies
-- Migration: 20261102000000_init_mailguard.sql
-- ==============================================================================

-- 1. Create PREDICTIONS Table
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    subject TEXT NOT NULL DEFAULT '',
    prediction TEXT NOT NULL CHECK (prediction IN ('spam', 'safe')),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    explanation_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_version TEXT NOT NULL DEFAULT 'mailguard-bilstm-v1.0.0',
    email_body TEXT DEFAULT NULL
);

-- Index for fast user queries ordered by creation date
CREATE INDEX IF NOT EXISTS idx_predictions_user_created 
ON public.predictions(user_id, created_at DESC);

-- 2. Create USER_SETTINGS Table (Privacy & Storage Preferences)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    store_email_body BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on public.predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Users can only read their own predictions
CREATE POLICY "Users can select own predictions"
ON public.predictions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT policy: Users can only insert rows where user_id = auth.uid()
CREATE POLICY "Users can insert own predictions"
ON public.predictions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE policy: Users can only update their own predictions
CREATE POLICY "Users can update own predictions"
ON public.predictions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE policy: Users can only delete their own predictions
CREATE POLICY "Users can delete own predictions"
ON public.predictions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Enable RLS on public.user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Users can view their own settings
CREATE POLICY "Users can select own settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT policy: Users can insert their own settings
CREATE POLICY "Users can insert own settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE policy: Users can update their own settings
CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE policy: Users can delete their own settings
CREATE POLICY "Users can delete own settings"
ON public.user_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ==============================================================================
-- Automatically initialize user settings on user sign up
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id, store_email_body)
    VALUES (NEW.id, false)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();
