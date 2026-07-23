import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read credentials from .env or process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.log("ℹ️ QEYD: .env faylında real Supabase URL və Anon Key daxil edilənə qədər seed skripti gözləmədədir.");
  console.log("Lütfən .env faylına VITE_SUPABASE_URL və VITE_SUPABASE_ANON_KEY daxil edin.");
  process.exit(0);
}

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
