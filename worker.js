/**
 * ============================================================================
 * AltStore & SideStore Source Generator - Edge / Serverless Worker
 * ============================================================================
 * Deployable on Cloudflare Workers, Vercel Edge Functions, or Deno Deploy.
 * Allows AltStore to query a dynamic URL (e.g., https://your-worker.workers.dev/?repo=utmapp/UTM)
 * and receive live, direct source.json output.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Enable CORS for external querying
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const repoParam = url.searchParams.get("repo") || url.searchParams.get("url");

    if (!repoParam) {
      return new Response(
        JSON.stringify({
          error: "Missing required 'repo' query parameter.",
          usage: "Pass a repository path via ?repo=owner/repo (e.g. ?repo=utmapp/UTM)."
        }, null, 2),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    try {
      // 1. Parse repository format
      let cleaned = repoParam.trim().replace(/\.git\/?$/i, '').replace(/\/+$/, '');
      let owner, repo;

      const urlMatch = cleaned.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/i);
      const shortMatch = cleaned.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$/);

      if (urlMatch) {
        owner = urlMatch[1];
        repo = urlMatch[2];
      } else if (shortMatch) {
        owner = shortMatch[1];
        repo = shortMatch[2];
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid repository format. Use 'owner/repo' or a full GitHub URL." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Optional GitHub Token from environment variable or query parameter
      const token = url.searchParams.get("token") || (env && env.GITHUB_TOKEN);
      const ghHeaders = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AltStore-Source-Generator-Worker"
      };
      if (token) {
        ghHeaders["Authorization"] = `Bearer ${token.trim()}`;
      }

      // 2. Fetch repository metadata
      const repoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { headers: ghHeaders });
      if (!repoRes.ok) {
        return new Response(
          JSON.stringify({ error: `GitHub API error for repository: HTTP ${repoRes.status}` }),
          { status: repoRes.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const repoData = await repoRes.json();

      // 3. Fetch releases
      const relRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=100`, { headers: ghHeaders });
      if (!relRes.ok) {
        return new Response(
          JSON.stringify({ error: `GitHub API error for releases: HTTP ${relRes.status}` }),
          { status: relRes.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const releasesData = await relRes.json();

      // 4. Filter releases with .ipa assets
      const ipaReleases = [];
      for (const rel of releasesData) {
        if (rel.draft) continue;
        const assets = rel.assets || [];
        const ipaAsset = assets.find(a => a.name && a.name.toLowerCase().endsWith(".ipa"));
        if (ipaAsset) {
          ipaReleases.push({ release: rel, asset: ipaAsset });
        }
      }

      if (ipaReleases.length === 0) {
        return new Response(
          JSON.stringify({ error: `No releases containing .ipa files were found in "${owner}/${repo}".` }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // 5. Construct normalized AltStore source.json
      const cleanOwner = owner.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanRepo = repo.toLowerCase().replace(/[^a-z0-9]/g, "");
      const bundleId = url.searchParams.get("bundleId") || `com.${cleanOwner || 'developer'}.${cleanRepo || 'app'}`;
      const sourceName = url.searchParams.get("name") || repoData.name || repo;

      const versions = ipaReleases.map(({ release, asset }) => {
        let rawTag = release.tag_name || release.name || "1.0.0";
        let cleanVersion = rawTag.trim().replace(/^v/i, "");
        if (!cleanVersion) cleanVersion = rawTag.trim();

        return {
          version: cleanVersion,
          date: release.published_at || release.created_at || new Date().toISOString(),
          downloadURL: asset.browser_download_url,
          size: asset.size || 0,
          localizedDescription: release.body || release.name || `Release ${cleanVersion}`
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const sourceJSON = {
        name: sourceName,
        identifier: bundleId,
        subtitle: repoData.description || `AltStore source for ${repoData.name || repo}`,
        description: repoData.description || "",
        iconURL: repoData.owner?.avatar_url || "",
        website: repoData.html_url || `https://github.com/${owner}/${repo}`,
        apps: [
          {
            name: sourceName,
            bundleIdentifier: bundleId,
            developerName: repoData.owner?.login || owner,
            subtitle: repoData.description || "",
            localizedDescription: repoData.description || "",
            iconURL: repoData.owner?.avatar_url || "",
            tintColor: "#007AFF",
            versions: versions
          }
        ],
        news: []
      };

      // Return clean raw JSON response directly to AltStore
      return new Response(JSON.stringify(sourceJSON, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=1800, s-maxage=3600",
          ...corsHeaders
        }
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }
};

