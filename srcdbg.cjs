(async () => {
  const fs = require('fs');
  const env = {};
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  const { createClient } = await import('@supabase/supabase-js');
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
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
  ];
  for (const [label, table, cols] of checks) {
    const { error } = await sb.from(table).select(cols).limit(1);
    console.log(label + ':', error ? 'MISSING (' + error.message.slice(0, 110) + ')' : 'OK');
  }
  const rpc = await sb.rpc('increment_coupon_use', { p_coupon_id: '00000000-0000-0000-0000-000000000000' });
  console.log('increment_coupon_use rpc:', rpc.error ? 'RPC-ERR ' + rpc.error.message.slice(0, 110) : 'OK (no-op)');
})();
