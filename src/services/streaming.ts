/**
 * Streaming Service
 * Fetches audio stream URLs from Piped and Invidious instances
 */

let instancesCache: any = null;
let instancesCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi-libre.kavin.rocks",
  "https://piped-api.privacy.com.de",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.drgns.space",
  "https://pipedapi.owo.si",
  "https://pipedapi.ducks.party",
  "https://piped-api.codespace.cz",
  "https://pipedapi.reallyaweso.me",
  "https://api.piped.private.coffee",
  "https://pipedapi.darkness.services",
  "https://pipedapi.orangenet.cc",
];

async function getDynamicInstances() {
  const now = Date.now();
  if (instancesCache && (now - instancesCacheTime) < CACHE_DURATION) {
    return instancesCache;
  }

  try {
    const response = await fetch("https://raw.githubusercontent.com/n-ce/Uma/main/dynamic_instances.json");
    const data = await response.json();
    data.piped = PIPED_INSTANCES;
    instancesCache = data;
    instancesCacheTime = now;
    return instancesCache;
  } catch {
    return {
      piped: PIPED_INSTANCES,
      invidious: ["https://yt.omada.cafe", "https://y.com.sb", "https://inv.nadeko.net"],
    };
  }
}

/**
 * Primary: Fetch stream URLs directly from YouTube Music internal player API.
 * Uses the same WEB_REMIX client that the website's YouTube IFrame uses.
 * No Piped/Invidious required — works directly like the web player.
 */
export async function fetchFromYouTube(videoId: string) {
  const clients = [
    {
      clientName: "WEB_REMIX",
      clientVersion: "1.20250701.01.00",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      origin: "https://music.youtube.com",
      clientNameId: "67",
      playerUrl: "https://music.youtube.com/youtubei/v1/player?prettyPrint=false",
    },
    {
      clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      clientVersion: "2.0",
      userAgent: "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1",
      origin: "https://www.youtube.com",
      clientNameId: "85",
      playerUrl: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    },
  ];

  for (const client of clients) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const payload = {
        videoId,
        context: {
          client: {
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            hl: "en",
            gl: "US",
          },
        },
        playbackContext: {
          contentPlaybackContext: {
            signatureTimestamp: 19950,
          },
        },
      };

      const response = await fetch(client.playerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.userAgent,
          "Origin": client.origin,
          "Referer": client.origin + "/",
          "X-YouTube-Client-Name": client.clientNameId,
          "X-YouTube-Client-Version": client.clientVersion,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (data?.playabilityStatus?.status === "OK") {
        const streamingData = data.streamingData;
        if (!streamingData) continue;

        const audioFormats = [
          ...(streamingData.adaptiveFormats || []),
          ...(streamingData.formats || []),
        ].filter((f: any) =>
          (f.mimeType?.includes("audio") || f.audioQuality) && f.url
        );

        if (audioFormats.length === 0) continue;

        // Sort by bitrate descending for best quality
        audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

        return {
          success: true,
          service: "youtube",
          streamingUrls: audioFormats.map((f: any) => ({
            url: f.url,
            mimeType: f.mimeType,
            bitrate: f.bitrate,
            audioQuality: f.audioQuality,
            itag: f.itag,
          })),
          metadata: {
            id: videoId,
            title: data.videoDetails?.title,
            author: data.videoDetails?.author,
            duration: parseInt(data.videoDetails?.lengthSeconds || "0"),
            thumbnail: data.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
          },
        };
      }
    } catch {
      continue;
    }
  }

  return { success: false, error: "YouTube direct extraction failed" };
}

export async function fetchFromPiped(videoId: string) {
  const instances = await getDynamicInstances();
  const pipedInstances = instances.piped || [];

  for (const instance of pipedInstances) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`${instance}/streams/${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();

      if (data?.error) continue;

      if (data?.audioStreams?.length) {
        const instanceUrl = new URL(instance);
        const proxyHost = instanceUrl.host.replace("pipedapi", "pipedproxy").replace("api.", "proxy.");

        return {
          success: true,
          instance,
          streamingUrls: data.audioStreams.map((s: any) => ({
            url: s.url,
            quality: s.quality,
            mimeType: s.mimeType,
            bitrate: s.bitrate,
            proxyHost,
          })),
          metadata: {
            id: videoId,
            title: data.title,
            uploader: data.uploader,
            thumbnail: data.thumbnailUrl,
            duration: data.duration,
            views: data.views,
          },
          hlsUrl: data.hls,
        };
      }
    } catch {
      continue;
    }
  }

  return { success: false, error: "No working Piped instances found" };
}

export async function fetchFromInvidious(videoId: string) {
  const instances = await getDynamicInstances();
  const invidiousInstances = instances.invidious || [];

  for (const instance of invidiousInstances) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();

      if (data) {
        const audioFormats = (data.adaptiveFormats || []).filter((f: any) =>
          f.type?.includes("audio") || f.mimeType?.includes("audio")
        );

        if (audioFormats.length === 0) continue;

        return {
          success: true,
          instance,
          streamingUrls: audioFormats.map((f: any) => ({
            url: `${instance}/latest_version?id=${videoId}&itag=${f.itag}`,
            directUrl: f.url,
            bitrate: f.bitrate,
            type: f.type,
            audioQuality: f.audioQuality,
            itag: f.itag,
          })),
          metadata: {
            id: videoId,
            title: data.title,
            author: data.author,
            thumbnail: data.videoThumbnails?.[0]?.url,
            lengthSeconds: data.lengthSeconds,
            viewCount: data.viewCount,
          },
        };
      }
    } catch {
      continue;
    }
  }

  return { success: false, error: "No working Invidious instances found" };
}
