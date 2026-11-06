-- Source snapshot: Table/Notes.md, 6 November 2026.
-- 37 requested names; Apple already exists as Granny Smith Apple (slug apple).
-- Expected new rows against that snapshot: 36. Existing rows and artwork are never overwritten.
-- Run in Supabase SQL Editor. Safe to rerun; no product assignments are changed.
begin;
with incoming(slug,name,name_ar,color,description) as (
 values
  ('blackcurrant', 'Blackcurrant', 'الكشمش الأسود', '#69506a', 'Tart dark berries with a fresh, green edge.'),
  ('apple', 'Apple', 'تفاح', '#78855c', 'Crisp, juicy fruit with a gently sweet, fresh character.'),
  ('pineapple', 'Pineapple', 'أناناس', '#a58a48', 'Bright tropical fruit with a sweet, tangy sparkle.'),
  ('pear', 'Pear', 'كمثرى', '#92976a', 'Soft, juicy fruit with a delicate, fresh sweetness.'),
  ('peach', 'Peach', 'خوخ', '#c18d74', 'Velvety fruit with a soft, nectar-like sweetness.'),
  ('plum', 'Plum', 'برقوق', '#79516b', 'Rich stone fruit with a rounded, sweet-tart depth.'),
  ('raspberry', 'Raspberry', 'توت العليق', '#a65d70', 'Lively red berries with a tart, juicy sweetness.'),
  ('lemon', 'Lemon', 'ليمون', '#b8a34c', 'A sharp, sparkling citrus note with a clean, zesty lift.'),
  ('orange', 'Orange', 'برتقال', '#ba844b', 'Sunny citrus with a juicy sweetness and a bright peel accent.'),
  ('jasmine', 'Jasmine', 'ياسمين', '#aaa085', 'A radiant white floral note with a rich, softly sensual character.'),
  ('lily-of-the-valley', 'Lily of the Valley', 'زنبق الوادي', '#8d9a82', 'A delicate, dewy floral note with a fresh, green softness.'),
  ('freesia', 'Freesia', 'فريزيا', '#b6a18f', 'An airy floral note with a bright, gently fruity freshness.'),
  ('violet', 'Violet', 'بنفسج', '#80708f', 'A soft floral note with a delicate, powdery sweetness.'),
  ('cyclamen', 'Cyclamen', 'بخور مريم', '#a78196', 'A light, fresh floral accord with a watery, airy impression.'),
  ('ylang-ylang', 'Ylang Ylang', 'يلانغ يلانغ', '#b3a15b', 'A lush floral note with a creamy, gently spicy sweetness.'),
  ('geranium', 'Geranium', 'إبرة الراعي', '#8d8470', 'A fresh, rosy floral note with a crisp, green edge.'),
  ('heliotrope', 'Heliotrope', 'الهليوتروب', '#9c8a9f', 'A tender, powdery floral note with a soft, almond-like sweetness.'),
  ('coconut-blossom', 'Coconut Blossom', 'أزهار جوز الهند', '#b4a489', 'A soft tropical floral impression with a gently creamy warmth.'),
  ('green', 'Green', 'أخضر', '#64806a', 'A crisp, leafy accord that evokes freshly cut stems and foliage.'),
  ('artemisia', 'Artemisia', 'شيح', '#7d8b77', 'A dry, aromatic herbal note with a green, gently bitter character.'),
  ('vetiver', 'Vetiver', 'نجيل الهند', '#827550', 'An earthy, dry woody note with a subtle, grassy freshness.'),
  ('patchouli', 'Patchouli', 'باتشولي', '#6a775a', 'A deep, earthy note with a woody, softly balsamic richness.'),
  ('moss', 'Moss', 'طحلب', '#6f7a59', 'A cool, earthy-green accord with a soft, forest-like depth.'),
  ('guaiac-wood', 'Guaiac Wood', 'خشب الغاياك', '#84664f', 'A smooth woody note with a gently smoky, balsamic warmth.'),
  ('cashmere-wood', 'Cashmere Wood', 'خشب الكشمير', '#a09386', 'A soft, enveloping woody accord with a musky, velvety texture.'),
  ('cedarwood', 'Cedarwood', 'خشب الأرز', '#956f54', 'A dry, clean woody note with a quietly warm, pencil-shaving character.'),
  ('nutmeg', 'Nutmeg', 'جوزة الطيب', '#97775b', 'A warm, gently sweet spice with a dry, aromatic richness.'),
  ('cardamom', 'Cardamom', 'هيل', '#889264', 'A bright aromatic spice with a cool, fresh lift and a warm undertone.'),
  ('cinnamon', 'Cinnamon', 'قرفة', '#a27154', 'A warm, sweet spice with a rich, gently woody character.'),
  ('vanilla', 'Vanilla', 'فانيليا', '#baa27b', 'A soft, creamy note with a familiar, gently sweet warmth.'),
  ('tonka-bean', 'Tonka Bean', 'حبوب التونكا', '#8c7059', 'A warm note with almond-like sweetness and a softly powdery finish.'),
  ('gourmand', 'Gourmand', 'غورماند', '#aa8767', 'A comforting accord inspired by sweet, creamy and toasted aromas.'),
  ('tobacco', 'Tobacco', 'تبغ', '#80644f', 'A warm, aromatic note with a dry, softly sweet richness.'),
  ('incense', 'Incense', 'بخور', '#8b837b', 'A resinous, smoky accord with a dry, contemplative warmth.'),
  ('styrax', 'Styrax', 'راتنج الستيراكس', '#9c7960', 'A rich balsamic note with sweet, resinous and gently leathery nuances.'),
  ('oriental', 'Oriental', 'شرقي', '#9b7b55', 'A warm accord combining amber-like richness with spice and balsamic depth.'),
  ('animalic', 'Animalic', 'حيواني', '#8f796b', 'A warm, musky accord with a subtly textured, sensual depth.')
)
insert into public.notes (slug,name,name_ar,color,description,glyph,is_active)
select i.slug,i.name,i.name_ar,i.color,i.description,'/notes/essence.svg',true
from incoming i
where not exists (
 select 1 from public.notes n
 where n.slug=i.slug or lower(btrim(n.name))=lower(btrim(i.name))
)
on conflict (slug) do nothing;
commit;
