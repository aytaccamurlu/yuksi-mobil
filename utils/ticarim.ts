import { TicarimCategory } from "@/service/mockData";

export const CATEGORY_KEY_TO_SLUG: Record<TicarimCategory, string> = {
    motorcycle: "motosiklet",
    minivan: "minivan",
    panelvan: "panelvan",
    pickup: "kamyonet",
    truck: "kamyon",
};

export const CATEGORY_SLUG_TO_KEY: Record<string, TicarimCategory> = Object.fromEntries(
    Object.entries(CATEGORY_KEY_TO_SLUG).map(([key, slug]) => [slug, key as TicarimCategory]),
);

export const CATEGORY_KEY_TO_ID: Record<TicarimCategory, string> = {
    motorcycle: "06a57a34-d187-449d-bb48-76269bc60468",
    minivan: "1c1962c3-a435-482e-b9fb-8c1913a960b7",
    panelvan: "edef899e-d677-4bdb-882f-f4903fc6e1eb",
    pickup: "d1a8a0cb-963e-48b8-8891-77d6c033f5b2",
    truck: "cd54e577-39dc-4656-8f94-ac16c8cd6b07",
};

export const CATEGORY_ID_TO_KEY: Record<string, TicarimCategory> = Object.fromEntries(
    Object.entries(CATEGORY_KEY_TO_ID).map(([key, id]) => [id, key as TicarimCategory]),
);

const CATEGORY_NAME_TO_KEY: Record<string, TicarimCategory> = {
    Motosiklet: "motorcycle",
    Minivan: "minivan",
    Panelvan: "panelvan",
    Kamyonet: "pickup",
    Kamyon: "truck",
};

export const ATTRIBUTE_DEFINITIONS: Record<string, { id: string; key: string }[]> = {
    "06a57a34-d187-449d-bb48-76269bc60468": [
        { id: "b4b57588-5006-4271-9dab-c80cc6b5a7e9", key: "engine_capacity" },
        { id: "119219c3-5d4c-4d6e-9b9a-78b9d3250ba5", key: "transmission" },
    ],
    "d1a8a0cb-963e-48b8-8891-77d6c033f5b2": [{ id: "35fbbd50-2a9f-4084-a247-78d395905ee3", key: "body_type" }],
    "cd54e577-39dc-4656-8f94-ac16c8cd6b07": [
        { id: "82ed60cb-6529-4b0b-bc33-cc3f90f0820d", key: "axle_count" },
        { id: "bdb7a48a-7c02-49d9-b321-2e04ea36f3e1", key: "load_capacity" },
    ],
};

export const attributeDefinitionId = (categoryId: string, key: string): string | undefined =>
    ATTRIBUTE_DEFINITIONS[categoryId]?.find((a) => a.key === key)?.id;

export const FUEL_TYPE_OPTIONS: { label: string; value: number }[] = [
    { label: "Benzin", value: 0 },
    { label: "Dizel", value: 1 },
    { label: "LPG", value: 2 },
    { label: "Elektrik", value: 3 },
    { label: "Hibrit", value: 4 },
    { label: "Diğer", value: 5 },
];

const FUEL_TYPE_API_TO_LABEL: Record<string, string> = {
    Petrol: "Benzin",
    Diesel: "Dizel",
    Lpg: "LPG",
    Electric: "Elektrik",
    Hybrid: "Hibrit",
    Other: "Diğer",
};

export const fuelTypeToApi = (label: string): number =>
    FUEL_TYPE_OPTIONS.find((o) => o.label === label)?.value ?? 5;

export const fuelTypeFromApi = (value: any): string => {
    if (typeof value === "number") return FUEL_TYPE_OPTIONS.find((o) => o.value === value)?.label || "Diğer";
    return FUEL_TYPE_API_TO_LABEL[value] || value || "";
};

export const VEHICLE_CONDITION_OPTIONS: { label: string; value: number }[] = [
    { label: "Sıfır", value: 0 },
    { label: "İkinci El", value: 1 },
    { label: "Hasarlı", value: 2 },
];

const CONDITION_API_TO_LABEL: Record<string, string> = {
    New: "Sıfır",
    Used: "İkinci El",
    Damaged: "Hasarlı",
};

export const conditionToApi = (label: string): number =>
    VEHICLE_CONDITION_OPTIONS.find((o) => o.label === label)?.value ?? 1;

export const conditionFromApi = (value: any): string => {
    if (typeof value === "number") return VEHICLE_CONDITION_OPTIONS.find((o) => o.value === value)?.label || "İkinci El";
    return CONDITION_API_TO_LABEL[value] || value || "";
};

export const fromApiListing = (raw: any): any => {
    if (!raw || raw.category_id === undefined) return raw;

    const locationParts = [raw.district, raw.city].filter(Boolean);
    const conditionLabel = conditionFromApi(raw.vehicle_condition);
    const attrs: any[] = raw.attributes || [];
    const attrByKey = (key: string) => attrs.find((a) => a.key === key)?.value;

    return {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        category: CATEGORY_NAME_TO_KEY[raw.category_name] || CATEGORY_ID_TO_KEY[raw.category_id] || raw.category_name,
        categoryId: raw.category_id,
        brand: raw.brand_name,
        brandId: raw.brand_id,
        model: raw.model_name,
        modelId: raw.model_id,
        vehicleType: raw.vehicle_type_name,
        vehicleTypeId: raw.vehicle_type_id,
        type: raw.vehicle_type_name,
        fuel: fuelTypeFromApi(raw.fuel_type),
        condition: conditionLabel,
        conditionScore: conditionLabel === "İkinci El" && raw.condition_score != null ? `10/${raw.condition_score}` : "",
        year: raw.year,
        km: raw.kilometer,
        engineCc: attrByKey("engine_capacity") || "",
        transmissionType: attrByKey("transmission") || "",
        price: raw.price,
        currency: raw.currency,
        location: locationParts.join("/"),
        city: raw.city,
        district: raw.district,
        latitude: raw.latitude,
        longitude: raw.longitude,
        distanceKm: raw.distance_km,
        allowMessage: raw.allow_message,
        allowPhone: raw.allow_phone,
        status: raw.status,
        rejectionReason: raw.rejection_reason,
        viewCount: raw.view_count,
        createdAt: raw.created_at,
        publishedAt: raw.published_at,
        ownerName: raw.seller_display_name,
        ownerId: raw.owner_id,
        photos: (raw.images || []).map((img: any) => img.image_url).filter(Boolean),
        listingImages: raw.images || [],
        attributes: raw.attributes || [],
    };
};

export const fromApiListingCard = (raw: any): any => {
    if (!raw || raw.category_id !== undefined) {
        return fromApiListing(raw);
    }
    if (raw.cover_image_url === undefined) return raw;

    return {
        id: raw.id,
        title: raw.title,
        rating: 0,
        reviewCount: 0,
        verified: false,
        photos: raw.cover_image_url ? [raw.cover_image_url] : [],
        city: raw.city,
        district: raw.district,
        location: [raw.district, raw.city].filter(Boolean).join("/"),
        price: raw.price,
        currency: raw.currency,
        year: raw.year,
        km: raw.kilometer,
        status: raw.status,
        publishedAt: raw.published_at,
        createdAt: raw.created_at,
        viewCount: raw.view_count,
        distanceKm: raw.distance_km,
    };
};
