import { Response } from 'express';

// ─── Lightweight Server-Sent Events hub ────────────────────────────────────────
// Channels are keyed by tenant databaseName so a school only receives its own
// events. Used to push new C2B payments and allocation updates to the inbox in
// real time (no polling). In-process only — fine for a single Node instance; for
// multi-instance, back this with Redis pub/sub later.

type Client = { id: number; res: Response };
const channels = new Map<string, Set<Client>>();
let seq = 0;

/** Register an SSE client on a channel (tenant db name). Returns a cleanup fn. */
export function subscribe(channel: string, res: Response): () => void {
    const client: Client = { id: ++seq, res };
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel)!.add(client);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',   // disable proxy buffering (nginx)
    });
    res.write('retry: 5000\n\n');
    // Heartbeat so proxies/load balancers keep the connection open.
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* gone */ } }, 25000);

    const cleanup = () => {
        clearInterval(ping);
        channels.get(channel)?.delete(client);
        if (channels.get(channel)?.size === 0) channels.delete(channel);
    };
    res.on('close', cleanup);
    return cleanup;
}

/** Push an event to every client on a channel. */
export function publish(channel: string, event: string, data: any) {
    const set = channels.get(channel);
    if (!set || set.size === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of set) {
        try { c.res.write(payload); } catch { /* dropped on next heartbeat */ }
    }
}
