import type { PageLoad } from './$types';
import { fetchOutlet } from '$lib/api';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	return fetchOutlet(Number(params.id));
};
