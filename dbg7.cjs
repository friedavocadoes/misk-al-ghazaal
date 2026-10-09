(async () => {
  const q = async (body) => {
    const r = await fetch('http://localhost:3000/api/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    console.log(r.status, JSON.stringify(j).slice(0, 400));
  };
  console.log('--- plain ---');
  await q({ lines: [{ slug: 'abukhalid', qty: 1 }], email: 'test@example.com' });
  console.log('--- bad coupon ---');
  await q({ lines: [{ slug: 'abukhalid', qty: 1 }], email: 'test@example.com', couponCode: 'NOPE' });
  console.log('--- bad product ---');
  await q({ lines: [{ slug: 'no-such-product', qty: 1 }], email: 'test@example.com' });
})();
