export type VehicleCategory = 'motorcycle' | 'minivan' | 'panelvan' | 'pickup' | 'truck';

export const VEHICLE_CATEGORY_ORDER: VehicleCategory[] = ['motorcycle', 'minivan', 'panelvan', 'pickup', 'truck'];

export const REAL_VEHICLE_PRODUCT_ID: Record<string, string> = {
    motorcycle: 'v-courier-moto',
    courier: 'v-courier-moto',
    minivan: 'v-courier-doblo',
    panelvan: 'v-buyuk-panelvan',
    pickup: 'v-kamyonet',
    truck: 'v-tir-agir',
};

export const DEFAULT_REAL_VEHICLE_PRODUCT_ID = 'v-courier-doblo';

export const CATEGORY_BY_PRODUCT_ID: Record<string, VehicleCategory> = VEHICLE_CATEGORY_ORDER.reduce(
    (acc, category) => {
        acc[REAL_VEHICLE_PRODUCT_ID[category]] = category;
        return acc;
    },
    {} as Record<string, VehicleCategory>,
);
