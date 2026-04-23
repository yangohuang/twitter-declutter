/**
 * x-batch-unfollow — ESM module for Browser Console
 *
 * Usage (paste in Console on x.com while logged in):
 *   const m = await import("https://cdn.jsdelivr.net/gh/yangohuang/twitter-declutter@main/scripts/unfollow.mjs");
 *   await m.unfollowBatch(["handle1","handle2"], { dryRun: true });
 *
 * After dry-run preview, re-run with { dryRun: false } to actually unfollow.
 *
 * Design notes:
 * - No backticks, no single quotes in string literals that might be smart-quote-replaced
 * - Auto-captures current bearer token (survives Twitter token rotations)
 * - Defaults to dryRun = true for safety
 * - Randomized 2.5-4s delays; batches > 50 trigger confirm dialog
 */

export async function unfollowBatch(handles, opts) {
  opts = opts || {};
  const dryRun = opts.dryRun !== false; // default true
  const delayMin = opts.delayMin || 2500;
  const delayMax = opts.delayMax || 4000;

  if (!Array.isArray(handles) || handles.length === 0) {
    console.error("handles must be a non-empty array of screen names");
    return { success: [], failed: [] };
  }

  const ct0Match = document.cookie.match(/ct0=([^;]+)/);
  const ct0 = ct0Match ? ct0Match[1] : null;
  if (!ct0) {
    alert("Not logged in to x.com. Log in first.");
    return { success: [], failed: [] };
  }

  const bearer = await captureBearer();
  if (!bearer) {
    console.error("Could not capture bearer token. Scroll the timeline once, then retry.");
    return { success: [], failed: [] };
  }
  console.log("Captured bearer: " + bearer.slice(0, 20) + "...");

  const headers = {
    "Authorization": bearer,
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Csrf-Token": ct0,
    "X-Twitter-Active-User": "yes",
    "X-Twitter-Auth-Type": "OAuth2Session"
  };

  if (!dryRun && handles.length > 50) {
    const proceed = confirm(
      "About to unfollow " + handles.length + " accounts. " +
      "X daily limit is ~400-500. Proceed?"
    );
    if (!proceed) {
      console.log("Aborted by user");
      return { success: [], failed: handles };
    }
  }

  const tag = dryRun ? "[DRY] " : "";
  console.log(tag + "Processing " + handles.length + " handles...");

  const success = [];
  const failed = [];

  for (const h of handles) {
    try {
      const r1 = await fetch(
        "/i/api/1.1/users/show.json?screen_name=" + encodeURIComponent(h),
        { headers: headers, credentials: "include" }
      );
      if (!r1.ok) throw new Error("lookup " + r1.status);
      const user = await r1.json();

      if (dryRun) {
        console.log("[dry] would unfollow @" + user.screen_name + " (" + user.id_str + ")");
        success.push(h);
      } else {
        const r2 = await fetch("/i/api/1.1/friendships/destroy.json", {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: "user_id=" + user.id_str
        });
        if (!r2.ok) throw new Error("destroy " + r2.status);
        console.log("unfollowed @" + user.screen_name);
        success.push(h);
      }
    } catch (e) {
      console.warn("fail @" + h + ": " + e.message);
      failed.push(h);
    }
    await sleep(delayMin + Math.random() * (delayMax - delayMin));
  }

  console.log("===== " + tag + "Complete =====");
  console.log("Success: " + success.length + "/" + handles.length);
  if (failed.length > 0) {
    console.log("Failed (retry manually):");
    console.log(failed);
  }
  if (dryRun) {
    console.log("");
    console.log("This was a DRY RUN. To actually unfollow, pass { dryRun: false }.");
  }

  return { success: success, failed: failed };
}

async function captureBearer() {
  const orig = window.fetch;
  return new Promise(function (resolve) {
    const tm = setTimeout(function () {
      window.fetch = orig;
      resolve(null);
    }, 5000);
    window.fetch = function () {
      const args = arguments;
      const h = (args[1] && args[1].headers) || (args[0] && args[0].headers);
      let auth;
      if (h instanceof Headers) auth = h.get("authorization");
      else if (h) auth = h.authorization || h.Authorization;
      if (auth && auth.indexOf("Bearer ") === 0 && auth.length > 100) {
        clearTimeout(tm);
        window.fetch = orig;
        resolve(auth);
      }
      return orig.apply(this, args);
    };
    orig("/i/api/1.1/account/settings.json", { credentials: "include" }).catch(function () {});
    setTimeout(function () { window.dispatchEvent(new Event("scroll")); }, 300);
  });
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}
