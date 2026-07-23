-- 1. Admins table for super-admin verification
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Admins table RLS: Only authenticated users can check if they are admin
CREATE POLICY "Admins Read Self" ON public.admins
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Helper Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profiles / Users metadata table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS:
-- Users can view and update their own profile
CREATE POLICY "Users Read Own Profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users Update Own Profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users Insert Own Profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_price NUMERIC NOT NULL,
    receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders RLS:
-- User can read their own orders; Admin can read all orders
CREATE POLICY "Orders Read Policy" ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- User can create their own order
CREATE POLICY "Orders Insert Policy" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only Admin can update order status or delete orders
CREATE POLICY "Orders Update Policy" ON public.orders
FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Orders Delete Policy" ON public.orders
FOR DELETE TO authenticated
USING (public.is_admin());

-- 4. Storage Bucket for Payment Receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Receipts Storage RLS Policies
CREATE POLICY "Authenticated Users Upload Receipt" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Receipts Read Policy" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'receipts');
