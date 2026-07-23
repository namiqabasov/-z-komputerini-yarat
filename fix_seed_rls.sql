-- Temporarily allow anon inserts for initial seeding
CREATE POLICY "Anon Temp Seed Insert" 
ON public.products FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Anon Temp Seed Upsert" 
ON public.products FOR UPDATE 
TO anon 
USING (true);
