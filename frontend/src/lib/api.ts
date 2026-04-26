const BASE = '/api';

export interface Stats {
	total_journalists: number;
	total_outlets: number;
	total_relationships: number;
}

export interface JournalistSummary {
	id: number;
	name: string;
	outlet_count: number;
}

export interface OutletSummary {
	id: number;
	name: string;
	journalist_count: number;
}

export interface OutletLink {
	outlet_id: number;
	outlet_name: string;
}

export interface JournalistLink {
	journalist_id: number;
	journalist_name: string;
}

export interface JournalistDetail {
	profile: {
		id: number;
		name: string;
		total_outlets: number;
	};
	navigation_links: OutletLink[];
}

export interface OutletDetail {
	profile: {
		id: number;
		name: string;
		total_journalists: number;
	};
	navigation_links: JournalistLink[];
}

async function get<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE}${path}`);
	if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
	return res.json();
}

export async function fetchStats(): Promise<Stats> {
	return get<Stats>('/stats');
}

export async function fetchCrossPlatformJournalists(): Promise<JournalistSummary[]> {
	const data = await get<{ journalists: JournalistSummary[] }>('/cross-platform-journalists');
	return data.journalists;
}

export async function fetchTopOutlets(limit = 15): Promise<OutletSummary[]> {
	const data = await get<{ outlets: OutletSummary[] }>(`/top-outlets/${limit}`);
	return data.outlets;
}

export async function fetchJournalist(id: number): Promise<JournalistDetail> {
	return get<JournalistDetail>(`/journalists/${id}`);
}

export async function fetchOutlet(id: number): Promise<OutletDetail> {
	return get<OutletDetail>(`/outlets/${id}`);
}

export async function searchJournalists(query: string): Promise<JournalistSummary[]> {
	const data = await get<{ journalists: JournalistSummary[] }>(
		`/search/journalists/${encodeURIComponent(query)}`
	);
	return data.journalists;
}

export async function searchOutlets(query: string): Promise<OutletSummary[]> {
	const data = await get<{ outlets: OutletSummary[] }>(
		`/search/outlets/${encodeURIComponent(query)}`
	);
	return data.outlets;
}
