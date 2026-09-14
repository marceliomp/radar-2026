export type SourcePoll = { notes?: string; source?: { url?: string | null; tseProtocol?: string | null } };

/** Render only public citation fields, never the operational ingestion notes. */
export function publicPollSource(poll: SourcePoll) {
  const raw = poll.source?.url ?? poll.notes?.match(/https?:\/\/[^\s<>"']+/)?.[0];
  let url: string | undefined;
  try {
    const parsed = new URL(raw ?? "");
    if (parsed.protocol === "https:" || parsed.protocol === "http:") url = parsed.href;
  } catch { /* No public citation recorded. */ }
  return { url, protocol: poll.source?.tseProtocol ?? poll.notes?.match(/\b[A-Z]{2}-\d{5}\/\d{4}\b/)?.[0] };
}

