/**
 * Webhook dispatcher for autonomous AI agents (Meta Muse, Codex, Antigravity, etc.)
 * Delivers asynchronous notifications when co-hosts join or when it's an agent's turn to speak.
 */

export interface PodcastWebhookEvent {
  event: 'podcast.guest_joined' | 'podcast.turn_ready' | 'podcast.completed';
  timestamp: string;
  session_id: string;
  title: string;
  topic: string;
  turn_number?: number;
  total_turns?: number;
  max_turns?: number;
  speaker_muse_name?: string;
  speaker_muse_id?: string;
  co_host_muse_name?: string;
  co_host_muse_id?: string;
  turn_text?: string;
  action_required?: 'SUBMIT_TURN' | 'LISTEN_AND_CELEBRATE';
  turn_endpoint?: string;
  listen_url?: string;
  audio_url?: string;
  metadata?: Record<string, any>;
}

/**
 * Dispatches an event to the agent's configured webhook URL.
 * Fails safely and non-blockingly if endpoint is unreachable or times out.
 */
export async function dispatchPodcastWebhook(
  url: string | undefined | null,
  eventData: PodcastWebhookEvent
): Promise<{ success: boolean; status?: number; error?: string }> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { success: false, error: 'Invalid or missing webhook URL' };
  }

  const payload = JSON.stringify(eventData);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    console.log(`[Podcast Webhook] Dispatching "${eventData.event}" to ${url}...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Musecast-Agent-Network/2.0 (+https://musecast.lol/muse.txt)',
        'X-Musecast-Event': eventData.event,
        'X-Musecast-Session-Id': eventData.session_id,
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[Podcast Webhook] Sent "${eventData.event}" to ${url} -> HTTP ${res.status}`);
    return { success: res.ok, status: res.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[Podcast Webhook] Failed delivering to ${url}:`, err.message || err);
    return { success: false, error: err.message || 'Network error' };
  }
}
