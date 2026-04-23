/**
 * x-batch-unfollow — ESM module for Browser Console
 *
 * Usage (paste in Console on x.com while logged in):
 *   const m = await import("https://cdn.jsdelivr.net/gh/yangohuang/twitter-declutter@main/scripts/unfollow.mjs");
 *   await m.unfollowBatch(["handle1","handle2"], { dryRun: true });
 *
 * After dry-run preview, re-run with { dryRun: false } to actually unfollow.
 *
 * Options:
 *   dryRun        (default true)  — preview, no actual unfollow
 *   verifyFirst   (default true)  — pre-check friendship status and skip
 *                                    accounts you are not following (idempotent:
 *                                    safe to re-run to mop up missed ones)
 *   delayMin/Max  (default 2500/4000 ms)
 *
 * Returns: { success: [...], skipped: [...], failed: [...] }
 *
 * Design notes:
 * - No backticks or quotes that break on smart-quote replacement
 * - Auto-captures current bearer token (survives Twitter token rotations)
 * - Pre-flight /friendships/lookup to avoid noisy 403s on already-unfollowed accounts
 * - Randomized 2.5-4s delays; batches > 50 trigger a confirm dialog
 */

export async function unfollowBatch(handles, opts) {
  opts = opts || {};
  const dryRun = opts.dryRun !== false;
  const verifyFirst = opts.verifyFirst !== false;
  const delayMin = opts.delayMin || 2500;
  const delayMax = opts.delayMax || 4000;

  if (!Array.isArray(handles) || handles.length === 0) {
    console.error("handles must be a non-empty array of screen names");
    return { success: [], skipped: [], failed: [] };
  }

  const ct0Match = document.cookie.match(/ct0=([^;]+)/);
  const ct0 = ct0Match ? ct0Match[1] : null;
  if (!ct0) {
    alert("Not logged in to x.com. Log in first.");
    return { success: [], skipped: [], failed: [] };
  }

  const bearer = await captureBearer();
  if (!bearer) {
    console.error("Could not capture bearer token. Scroll the timeline once, then retry.");
    return { success: [], skipped: [], failed: [] };
  }
  console.log("Captured bearer: " + bearer.slice(0, 20) + "...");

  const headers = {
    "Authorization": bearer,
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Csrf-Token": ct0,
    "X-Twitter-Active-User": "yes",
    "X-Twitter-Auth-Type": "OAuth2Session"
  };

  // Pre-flight: check current friendship status for idempotence
  let toProcess = handles.slice();
  const skipped = [];
  if (verifyFirst) {
    console.log("Pre-checking friendship status for " + handles.length + " handles...");
    try {
      const followingMap = await lookupRelationships(handles, headers);
      toProcess = [];
      for (const h of handles) {
        if (followingMap[h.toLowerCase()] === true) {
          toProcess.push(h);
        } else {
          skipped.push(h);
        }
      }
      console.log("  Already not-followed (will skip): " + skipped.length);
      console.log("  Currently followed (will process): " + toProcess.length);
      if (skipped.length > 0) {
        console.log("  Skipped handles:", skipped);
      }
    } catch (e) {
      console.warn("Pre-check failed (" + e.message + ") — proceeding without verification");
      toProcess = handles.slice();
    }
  }

  if (toProcess.length === 0) {
    console.log("Nothing to do — all handles already unfollowed. Done.");
    return { success: [], skipped: skipped, failed: [] };
  }

  if (!dryRun && toProcess.length > 50) {
    const proceed = confirm(
      "About to unfollow " + toProcess.length + " accounts. " +
      "X daily limit is ~400-500. Proceed?"
    );
    if (!proceed) {
      console.log("Aborted by user");
      return { success: [], skipped: skipped, failed: toProcess };
    }
  }

  const tag = dryRun ? "[DRY] " : "";
  console.log(tag + "Processing " + toProcess.length + " handles...");

  const success = [];
  const failed = [];

  for (const h of toProcess) {
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
  console.log("Success: " + success.length + "/" + toProcess.length);
  console.log("Skipped (already not followed): " + skipped.length);
  if (failed.length > 0) {
    console.log("Failed (retry by re-running same command):");
    console.log(failed);
  }
  if (dryRun) {
    console.log("");
    console.log("This was a DRY RUN. To actually unfollow, pass { dryRun: false }.");
  }

  return { success: success, skipped: skipped, failed: failed };
}

/**
 * Check which handles the current user is following.
 * Uses /i/api/1.1/friendships/lookup.json (batch, up to 100 per call).
 * Returns a map { screenNameLowercase: true|false }.
 */
async function lookupRelationships(handles, headers) {
  const result = {};
  for (let i = 0; i < handles.length; i += 100) {
    const chunk = handles.slice(i, i + 100);
    const url = "/i/api/1.1/friendships/lookup.json?screen_name=" +
                encodeURIComponent(chunk.join(","));
    const r = await fetch(url, { headers: headers, credentials: "include" });
    if (!r.ok) throw new Error("friendships/lookup " + r.status);
    const data = await r.json();
    for (const entry of data) {
      const name = entry.screen_name.toLowerCase();
      const conns = entry.connections || [];
      result[name] = conns.indexOf("following") !== -1;
    }
  }
  // Handles not returned by API are definitely not followed (deleted/suspended/invalid)
  for (const h of handles) {
    if (!(h.toLowerCase() in result)) result[h.toLowerCase()] = false;
  }
  return result;
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
