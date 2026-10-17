import {
  Citrus,
  Crown,
  Droplets,
  Feather,
  Flame,
  Flower2,
  Gem,
  Heart,
  Leaf,
  Moon,
  Sparkles,
  Star,
  Sun,
  Trees,
  Waves,
  Wind,
} from "lucide-react";

const GLYPH_MAP = {
  droplet: Droplets,
  sparkles: Sparkles,
  flame: Flame,
  flower: Flower2,
  trees: Trees,
  sun: Sun,
  leaf: Leaf,
  gem: Gem,
  crown: Crown,
  wind: Wind,
  citrus: Citrus,
  heart: Heart,
  feather: Feather,
  star: Star,
  moon: Moon,
  waves: Waves,
} as const;

export type NoteGlyphKey = keyof typeof GLYPH_MAP;

export const NOTE_GLYPH_OPTIONS: { key: NoteGlyphKey; label: string }[] = [
  { key: "droplet", label: "Essence Drop (Default)" },
  { key: "flower", label: "Blossom / Rose / Floral" },
  { key: "trees", label: "Oud / Woods / Cedar" },
  { key: "flame", label: "Bakhoor / Incense / Smoke" },
  { key: "sparkles", label: "Musk / Aldehydes / Ambergris" },
  { key: "sun", label: "Solar Amber / Warm Resin" },
  { key: "citrus", label: "Bergamot / Citrus / Zest" },
  { key: "leaf", label: "Patchouli / Vetiver / Green" },
  { key: "gem", label: "Frankincense / Myrrh / Crystal" },
  { key: "crown", label: "Royal Oudh / Saffron" },
  { key: "star", label: "Warm Spice / Cardamom / Pepper" },
  { key: "heart", label: "Vanilla / Tonka / Gourmand" },
  { key: "feather", label: "White Musk / Cashmere / Powdery" },
  { key: "wind", label: "Fresh / Airy / Ozonic" },
  { key: "waves", label: "Marine / Aquatic" },
  { key: "moon", label: "Nocturnal / Leather / Dark Oud" },
];

export function NoteGlyph({
  glyph,
  className = "size-4",
  style,
}: {
  glyph?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const key = (glyph ?? "droplet").trim().toLowerCase() as NoteGlyphKey;
  const Icon = GLYPH_MAP[key] ?? Droplets;
  return <Icon className={className} style={style} />;
}