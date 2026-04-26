import type { PageLoad } from './$types';
import { fetchJournalist } from '$lib/api';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	return fetchJournalist(Number(params.id));
};
