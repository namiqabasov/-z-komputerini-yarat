-- 1. Create 'products' table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    specs JSONB DEFAULT '{}'::jsonb,
    compatibility JSONB DEFAULT '{}'::jsonb,
    stock INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast filtering by category and active status
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for 'products' table

-- Public Read Policy: Anyone can view active products
CREATE POLICY "Public Read Active Products"
ON public.products FOR SELECT
USING (is_active = true OR auth.role() = 'authenticated');

-- Admin Write Policies: Authenticated admin users can Insert, Update, and Delete
CREATE POLICY "Admin Insert Products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admin Update Products"
ON public.products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin Delete Products"
ON public.products FOR DELETE
TO authenticated
USING (true);


-- 3. Storage Bucket setup for Product Images
-- Note: Run this in Supabase SQL Editor or create a public bucket named 'product-images' in Supabase Dashboard
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies: Anyone can view images, Authenticated admin can upload/delete
CREATE POLICY "Public Storage Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admin Storage Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Admin Storage Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
