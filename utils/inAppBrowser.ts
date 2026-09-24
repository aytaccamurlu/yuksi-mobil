const WEBSITE_BASE_URL = 'https://www.yuksi.tr';

export const resolveWebsiteUrl = (link: string): string | null => {
    const trimmed = link.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('/')) return WEBSITE_BASE_URL + trimmed;
    return null;
};
