(async () => {
  require('dotenv').config();
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.log('NO ENV'); process.exit(1); }
  const sb = createClient(url, key);
  const checks = [
    ['orders new cols', 'orders', 'user_id,coupon_code,discount,referral_code'],
    ['profiles referral', 'profiles', 'referral_code,referred_by,referral_uses,avatar_url'],
    ['coupons', 'coupons', 'id,code'],
    ['referral_settings', 'referral_settings', 'percent,active'],
    ['reviews', 'reviews', 'id'],
    ['lineups', 'lineups', 'id'],
    ['notes', 'notes', 'id'],
    ['rituals', 'rituals', 'id'],
    ['increment_coupon_use rpc', null, null],
  ];
  for (const [label, table, cols] of checks) {
    try {
      if (!table) {
        const { error } = await sb.rpc('increment_coupon_use', { p_coupon_id: '00000000-0000-0000-0000-000000000000' });
        console.log(label + ':', error ? 'RPC-ERR ' + error.message : 'OK (no-op)');
      } else {
        const { error } = await sb.from(table).select(cols).limit(1);
        console.log(label + ':', error ? 'MISSING (' + error.message.slice(0, 100) + ')' : 'OK');
      }
    } catch (e) { console.log(label + ': EXC ' + e.message.slice(0, 100)); }
  }
})();
