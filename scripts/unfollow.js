/**
 * x-batch-unfollow — Browser Console script for bulk X/Twitter unfollow
 *
 * USAGE:
 *   1. Open https://x.com and make sure you're logged in
 *   2. Press F12 → Console tab
 *   3. Edit HANDLES array below with screen names (no @)
 *   4. First run: DRY_RUN = true  (preview, no actual unfollow)
 *   5. When ready: DRY_RUN = false
 *   6. Paste entire script, press Enter
 *
 * SAFETY:
 *   - Dry-run default prevents accidents
 *   - Randomized 2.5-4s delay between requests (rate-limit friendly)
 *   - Auto-captures current bearer token (survives Twitter token rotations)
 *   - Fails loudly if bearer can't be captured (no silent 401)
 *
 * RATE LIMIT:
 *   X caps unfollow at ~400-500 per day. Batches over 50 trigger a confirm dialog.
 *
 * LIMITATIONS:
 *   - Uses v1.1 legacy endpoint (still active as of 2026-04, subject to X's deprecation)
 *   - One Twitter account per browser session
 */
(async () => {
  // ============ CONFIG ============
  const HANDLES = [
    // 'user1', 'user2', ...
  ];
  const DRY_RUN = true;        // ← Set to false to actually unfollow
  const DELAY_MIN_MS = 2500;
  const DELAY_MAX_MS = 4000;
  // =================================

  if (!HANDLES.length) {
    console.error('❌ HANDLES array is empty. Edit the script first.');
    return;
  }

  const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1];
  if (!ct0) {
    alert('❌ Not logged in to x.com. Log in first.');
    return;
  }

  // Capture the real bearer token that x.com is currently using.
  // This survives Twitter's periodic token rotations — no hardcoded fallback.
  const BEARER = await (async () => {
    const orig = window.fetch;
    return new Promise(resolve => {
      const tm = setTimeout(() => { window.fetch = orig; resolve(null); }, 5000);
      window.fetch = function(...args) {
        const h = args[1]?.headers || args[0]?.headers;
        let auth = h instanceof Headers
          ? h.get('authorization')
          : (h?.authorization || h?.Authorization);
        if (auth?.startsWith('Bearer ') && auth.length > 100) {
          clearTimeout(tm); window.fetch = orig; resolve(auth);
        }
        return orig.apply(this, args);
      };
      // Nudge the page to make a request that will expose the bearer
      orig('/i/api/1.1/account/settings.json', { credentials: 'include' }).catch(() => {});
      setTimeout(() => window.dispatchEvent(new Event('scroll')), 300);
    });
  })();

  if (!BEARER) {
    console.error('❌ Could not capture bearer token within 5s.');
    console.error('   Try: scroll the timeline once, then re-run this script.');
    return;
  }
  console.log(`✓ Captured bearer (${BEARER.slice(0, 25)}...)`);

  const hdr = {
    'Authorization': BEARER,
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Csrf-Token': ct0,
    'X-Twitter-Active-User': 'yes',
    'X-Twitter-Auth-Type': 'OAuth2Session'
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  if (HANDLES.length > 50 && !DRY_RUN) {
    const ok = confirm(
      `⚠️ About to unfollow ${HANDLES.length} accounts.\n` +
      `X's daily unfollow limit is ~400-500. Proceed?`
    );
    if (!ok) { console.log('Aborted by user'); return; }
  }

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Processing ${HANDLES.length} handles...`);

  const success = [], failed = [];
  for (const handle of HANDLES) {
    try {
      const resolved = await fetch(
        `/i/api/1.1/users/show.json?screen_name=${encodeURIComponent(handle)}`,
        { headers: hdr, credentials: 'include' }
      );
      if (!resolved.ok) throw new Error(`lookup ${resolved.status}`);
      const { id_str, screen_name } = await resolved.json();

      if (DRY_RUN) {
        console.log(`[dry] would unfollow @${screen_name} (${id_str})`);
        success.push(handle);
      } else {
        const destroy = await fetch('/i/api/1.1/friendships/destroy.json', {
          method: 'POST',
          headers: hdr,
          credentials: 'include',
          body: `user_id=${id_str}`
        });
        if (!destroy.ok) throw new Error(`destroy ${destroy.status}`);
        console.log(`✓ unfollowed @${screen_name}`);
        success.push(handle);
      }
    } catch (e) {
      console.warn(`✗ @${handle}: ${e.message}`);
      failed.push(handle);
    }
    await sleep(rand(DELAY_MIN_MS, DELAY_MAX_MS));
  }

  console.log(`\n===== ${DRY_RUN ? 'DRY RUN ' : ''}COMPLETE =====`);
  console.log(`Success: ${success.length}/${HANDLES.length}`);
  if (failed.length) console.log('Failed (retry manually):', failed);
  if (DRY_RUN) console.log('\n💡 To actually unfollow, set DRY_RUN = false and re-run.');
})();
