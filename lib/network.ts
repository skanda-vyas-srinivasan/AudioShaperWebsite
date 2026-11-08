import { classifyNetwork, Network } from './engagement';

export async function networkForRequest(req: Request): Promise<Network> {
  const token = process.env.IPINFO_TOKEN;
  const ip = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (!token || !ip || !/^[0-9a-f:.]+$/i.test(ip)) return classifyNetwork(null, null);
  try {
    const response = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(1200),
    });
    if (!response.ok) return classifyNetwork(null, null);
    const data = await response.json() as { asn?: unknown; as_name?: unknown };
    return classifyNetwork(data.asn, data.as_name);
  } catch {
    return classifyNetwork(null, null);
  }
}
