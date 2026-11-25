export const communityKinds = {
  society: 'Housing society',
  ganesh_mandal: 'Ganesh mandal',
  durga_mandal: 'Durga mandal',
  festival_committee: 'Festival committee',
  community_group: 'Community group',
} as const;
export type CommunityKind = keyof typeof communityKinds;
export interface CommunityDraft { name: string; city: string; location: string; kind: CommunityKind }
export interface Community extends CommunityDraft { id: string; registrationStatus: string }
export interface DirectoryFilters { name: string; city: string; kind: CommunityKind | '' }
export class CommunityError extends Error {}

export const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ');
export function normalizeCommunity(draft: CommunityDraft) {
  const result = { name: cleanText(draft.name), city: cleanText(draft.city), location: cleanText(draft.location), kind: draft.kind };
  for (const [key, maximum] of [['name', 120], ['city', 80], ['location', 200]] as const) {
    if (result[key].length < 2 || result[key].length > maximum) throw new CommunityError(`Enter a ${key === 'location' ? 'locality' : key} between 2 and ${maximum} characters.`);
  }
  if (!Object.hasOwn(communityKinds, result.kind)) throw new CommunityError('Choose a supported community type.');
  return { ...result, nameKey: result.name.toLowerCase(), cityKey: result.city.toLowerCase() };
}

export function readCommunity(id: string, data: Record<string, unknown>): Community {
  return { id, name: String(data.name ?? 'Unnamed community'), city: String(data.city ?? ''), location: String(data.location ?? ''), kind: Object.hasOwn(communityKinds, String(data.kind)) ? data.kind as CommunityKind : 'society', registrationStatus: String(data.registrationStatus ?? '') };
}
