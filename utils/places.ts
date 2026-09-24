import Constants from 'expo-constants';

export const GOOGLE_MAPS_KEY: string =
    (Constants.expoConfig?.extra as any)?.googleMapsApiKey ??
    (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey ??
    '';

export type PlacePrediction = {
    place_id: string;
    description: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
};

export type ResolvedPlace = {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    district: string;
    neighborhood: string;
};

const call = async (endpoint: string): Promise<any> => {
    if (!GOOGLE_MAPS_KEY) return null;
    try {
        const res = await fetch(`${endpoint}&key=${GOOGLE_MAPS_KEY}&language=tr`);
        return await res.json();
    } catch {
        return null;
    }
};

export const autocompletePlaces = async (input: string): Promise<PlacePrediction[]> => {
    if (input.trim().length < 2) return [];
    const data = await call(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:tr`,
    );
    return data?.status === 'OK' ? data.predictions : [];
};

const parseComponents = (components: any[] = []) => {
    const get = (types: string[]) =>
        components.find((c) => types.some((t) => c.types?.includes(t)))?.long_name || '';
    return {
        city: get(['administrative_area_level_1', 'locality']),
        district: get(['administrative_area_level_2']),
        neighborhood: get(['sublocality_level_1', 'neighborhood']),
    };
};

const toResolved = (r: any): ResolvedPlace => ({
    latitude: r.geometry.location.lat,
    longitude: r.geometry.location.lng,
    address: r.formatted_address,
    ...parseComponents(r.address_components),
});

export const resolvePlaceId = async (placeId: string): Promise<ResolvedPlace | null> => {
    const data = await call(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}`);
    return data?.status === 'OK' ? toResolved(data.result) : null;
};

export const reverseGeocode = async (lat: number, lng: number): Promise<ResolvedPlace | null> => {
    const data = await call(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}`);
    return data?.results?.[0] ? toResolved(data.results[0]) : null;
};

// Ticarim ilanı konumu "İlçe/Şehir" string olarak saklıyor (description.tsx split).
export const toTicarimLocation = (p: ResolvedPlace): string => {
    const district = p.district || p.neighborhood;
    return district && p.city ? `${district}/${p.city}` : p.city || p.address;
};
