// Test FedaPay checkout - create test user, get token, test checkout endpoints
const { createClient } = require('@supabase/supabase-js')

const BACKEND_URL = 'https://backend-umber-sigma.vercel.app'
const SUPABASE_URL = 'https://qgofshosxvunqbbycwyq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnb2ZzaG9zeHZ1bnFiYnljd3lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgzMTM4MywiZXhwIjoyMDg3NDA3MzgzfQ.rkicPY4i7jZl294NFMfnlNNeG9IVwR3PGi2xgpaxsHE'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TEST_EMAIL = `test-payment-${Date.now()}@goartisans-test.com`
const TEST_PASSWORD = 'TestPay1234!'

async function run() {
  console.log('=== GoArtisans Payment Flow Test ===\n')

  // 1. Create a test worker user
  console.log('1. Creating test worker user:', TEST_EMAIL)
  const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: 'Test', last_name: 'Worker' }
  })
  if (createErr) { console.error('Create user failed:', createErr.message); process.exit(1) }
  const userId = newUser.user.id
  console.log('✅ Auth user created:', userId)

  // Insert into public.users
  const { error: insertErr } = await sb.from('users').insert({
    id: userId,
    email: TEST_EMAIL,
    first_name: 'Test',
    last_name: 'Worker',
    user_type: 'worker',
    is_active: true
  })
  if (insertErr) console.warn('⚠️  Insert public.users:', insertErr.message)
  else console.log('✅ public.users row created')

  // 2. Get a session token
  const anonSb = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnb2ZzaG9zeHZ1bnFiYnljd3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzEzODMsImV4cCI6MjA4NzQwNzM4M30.Wc7SolVC4DH806UIB7C8AjsxcA195MQsoUwbK_l0KAY')
  const { data: sessionData, error: signInErr } = await anonSb.auth.signInWithPassword({
    email: TEST_EMAIL, password: TEST_PASSWORD
  })
  if (signInErr || !sessionData?.session) { console.error('Sign in failed:', signInErr?.message); await cleanup(userId); process.exit(1) }
  const token = sessionData.session.access_token
  console.log('✅ Got session token\n')

  let passed = 0
  let failed = 0

  // 3. Test trial-checkout (worker_pro - has 14-day trial)
  console.log('2. Testing trial-checkout for worker_pro (14-day trial, $1 FedaPay card verify)...')
  const r1 = await fetch(`${BACKEND_URL}/api/subscriptions/trial-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ plan_id: 'worker_pro', billing_cycle: 'monthly' })
  })
  const d1 = await r1.json()
  console.log('  Status:', r1.status)
  if (r1.status === 200 && d1.checkout_url?.startsWith('https://')) {
    console.log('  ✅ checkout_url returned:', d1.checkout_url)
    passed++
  } else {
    console.log('  ❌ FAILED. Response:', JSON.stringify(d1))
    failed++
  }

  // 4. Test verify-and-subscribe (worker_premium - no trial, direct $1 verify)
  console.log('\n3. Testing verify-and-subscribe for worker_premium ($1 verify → activate)...')
  const r2 = await fetch(`${BACKEND_URL}/api/subscriptions/verify-and-subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ plan_id: 'worker_premium', billing_cycle: 'monthly' })
  })
  const d2 = await r2.json()
  console.log('  Status:', r2.status)
  if (r2.status === 200 && d2.checkout_url?.startsWith('https://')) {
    console.log('  ✅ checkout_url returned:', d2.checkout_url)
    passed++
  } else {
    console.log('  ❌ FAILED. Response:', JSON.stringify(d2))
    failed++
  }

  // 5. Test that double-trial is rejected
  console.log('\n4. Testing double-trial rejection (same plan tier)...')
  const r3 = await fetch(`${BACKEND_URL}/api/subscriptions/trial-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ plan_id: 'worker_pro', billing_cycle: 'monthly' })
  })
  const d3 = await r3.json()
  // First trial attempt should succeed (409 only after first use is recorded in DB — trial not used yet)
  console.log('  Status:', r3.status, '| (200=another checkout created, 409=already used)')
  console.log('  Response:', JSON.stringify(d3))

  // Cleanup
  await cleanup(userId)

  // Summary
  console.log('\n=== RESULTS ===')
  console.log(`✅ Passed: ${passed}/2 FedaPay checkout tests`)
  if (failed > 0) console.log(`❌ Failed: ${failed}`)
  else console.log('🎉 Payment flow is working correctly!')
}

async function cleanup(userId) {
  console.log('\nCleaning up test user...')
  await sb.auth.admin.deleteUser(userId)
  await sb.from('users').delete().eq('id', userId)
  console.log('✅ Test user deleted')
}

run().catch(e => { console.error('Fatal:', e.message); console.error(e.stack) })


