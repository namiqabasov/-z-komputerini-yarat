import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit credentials
const supabaseUrl = 'https://efqjgtdpkiqgyameyavn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcWpndGRwa2lxZ3lhbWV5YXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODI1OTIsImV4cCI6MjEwMDM1ODU5Mn0._onRhB1Pd7ZNR6KlQg00jCnPbZmH_LEcJYHNBYbBmnY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const categories = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooler'];

async function seedData() {
  console.log("🚀 Supabase 'products' cədvəlinə məhsullar köçürülür...");
  
  let totalMigrated = 0;

  for (const cat of categories) {
    const filePath = path.join(__dirname, 'public', 'data', `${cat}.json`);
    if (!fs.existsSync(filePath)) continue;

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(rawData);

    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: cat,
      price: item.price,
      image: item.image,
      specs: item.specs || {},
      compatibility: item.compatibility || {},
      stock: 10,
      is_active: true
    }));

    const { data, error } = await supabase.from('products').upsert(formattedItems, { onConflict: 'id' });

    if (error) {
      console.error(`❌ ${cat} kateqoriyası üzrə xəta:`, error.message);
    } else {
      console.log(`✅ ${cat} kateqoriyasından ${formattedItems.length} məhsul uğurla köçürüldü.`);
      totalMigrated += formattedItems.length;
    }
  }

  console.log(`🎉 Yekun: Cəmi ${totalMigrated} məhsul Supabase-ə köçürüldü!`);
}

seedData();
