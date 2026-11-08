export type RetainedVisit = { id: string; timestamp: string; visitorId?: string | null; tag?: string | null };

export type RecordedPattern = {
  basis: 'retained-visit-metadata';
  nearbyCount: number;
  rapidRepeat: boolean;
  nearbyVisits: { id: string; timestamp: string; tag: string | null }[];
};

// The shared ID is a shortened network-plus-user-agent fingerprint, not a person or a session.
// Only actual retained visit records are returned. No duration or interaction is inferred.
export function recordedPatterns(visits: RetainedVisit[]): Map<string, RecordedPattern> {
  const groups = new Map<string, { visit: RetainedVisit; time: number }[]>();
  for (const visit of visits) {
    const time = Date.parse(visit.timestamp);
    if (!visit.visitorId || !/^[a-f0-9]{12}$/.test(visit.visitorId) || !Number.isFinite(time)) continue;
    const group = groups.get(visit.visitorId) || [];
    group.push({ visit, time });
    groups.set(visit.visitorId, group);
  }
  const result = new Map<string, RecordedPattern>();
  for (const group of groups.values()) {
    group.sort((a, b) => a.time - b.time);
    let left30 = 0;
    let right30 = 0;
    let left10 = 0;
    let right10 = 0;
    for (const { visit, time } of group) {
      while (left30 < group.length && group[left30].time < time - 30000) left30 += 1;
      while (right30 < group.length && group[right30].time <= time + 30000) right30 += 1;
      while (left10 < group.length && group[left10].time < time - 10000) left10 += 1;
      while (right10 < group.length && group[right10].time <= time + 10000) right10 += 1;
      result.set(visit.id, {
        basis: 'retained-visit-metadata',
        nearbyCount: right30 - left30,
        rapidRepeat: right10 - left10 >= 3,
        nearbyVisits: group.slice(left30, Math.min(right30, left30 + 10)).map(({ visit: other }) => ({ id: other.id, timestamp: other.timestamp, tag: other.tag || null })),
      });
    }
  }
  return result;
}
