import { JOB_STATUS_MAP, REAL_JOB_STATUS_MAP, VEHICLE_TYPE_NAMES } from '@/constants/shipments';
import type { TransformedJob } from '@/types/shipment';

// ─── Date Formatting ─────────────────────────────────────────

export const formatDateTime = (job: any): string => {
    if (job.deliveryDate && job.deliveryTime) {
        return `${job.deliveryTime} • ${job.deliveryDate}`;
    }
    if (job.createdAt) {
        const d = new Date(job.createdAt);
        const hours = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes().toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${hours}:${mins} • ${day}.${month}.${year}`;
    }
    return '—';
};

// ─── Time Filter Helpers ─────────────────────────────────────

export const isToday = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
};

export const isThisWeek = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo && d <= now;
};

export const isThisMonth = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// ─── Job Normalizer (gerçek backend ⇄ mock şekli) ─────────────
// Gerçek job snake_case ve düz (id/status/pickup_address/...); mock zaten
// camelCase (id/jobStatus/pickupAddress/...) — transformJob ikincisini
// bekliyor. Mock veriyi (zaten camelCase, .jobStatus alanı var) dokunmadan
// geçirir.

const VEHICLE_TYPE_FROM_PRODUCT_ID: Record<string, string> = {
    'v-courier-moto': 'motorcycle',
    'v-courier-doblo': 'minivan',
    'v-buyuk-panelvan': 'panelvan',
    'v-kamyonet': 'pickup',
    'v-tir-agir': 'truck',
};

export const fromApiJob = (job: any): any => {
    if (!job || job.jobStatus !== undefined) return job;
    return {
        id: job.id,
        jobStatus: REAL_JOB_STATUS_MAP[job.status] || job.status,
        courierName: job.courier_name || '',
        courierConversationId: job.courier_conversation_id || null,
        deliveryType: job.delivery_type,
        carrierType: job.carrier_type,
        vehicleType: job.vehicle_type || VEHICLE_TYPE_FROM_PRODUCT_ID[job.vehicle_product_id],
        pickupAddress: job.pickup_address,
        dropoffAddress: job.dropoff_address,
        totalPrice: job.total_price,
        specialNotes: job.special_notes,
        createdAt: job.created_at,
    };
};

// ─── Job Transformer ─────────────────────────────────────────

export const transformJob = (job: any): TransformedJob => ({
    id: job.id,
    type: job.deliveryType === 'immediate' ? 'hemen' : 'randevulu',
    status: JOB_STATUS_MAP[job.jobStatus] || 'bekliyor',
    courierName: job.courierName?.trim() || 'Henüz atanmadı',
    courierConversationId: job.courierConversationId || null,
    vehicleType:
        VEHICLE_TYPE_NAMES[job.vehicleType?.toLowerCase()] ||
        VEHICLE_TYPE_NAMES[job.carrierType?.toLowerCase()] ||
        'Araç',
    vehicleKey: job.vehicleType?.toLowerCase() || job.carrierType?.toLowerCase() || 'courier',
    from: job.pickupAddress || '—',
    to: job.dropoffAddress || '—',
    dateTime: formatDateTime(job),
    totalAmount: `${job.totalPrice || 0} ₺`,
    distanceKm: typeof job.distanceKm === 'number' ? job.distanceKm : null,
    createdAt: job.createdAt || '',
});

// ─── Order Transformer (yeni Orders API ⇄ TransformedJob) ─────

const ORDER_STATUS_MAP: Record<string, string> = {
    Searching5km: 'bekliyor',
    Searching10km: 'bekliyor',
    SearchingCityWide: 'bekliyor',
    DriverAssigned: 'atandı',
    Confirmed: 'yolda',
    Completed: 'tamamlandı',
    Cancelled: 'iptal',
    NoDriverFound: 'iptal',
};

// Order'da araç/ağırlık/tür/randevu alanları yok, hepsi note'a "Etiket: değer"
// olarak pipe'lanıyor (bkz. hooks/useCreateLoad.ts), burada geri ayıklanıyor.
const NOTE_PREFIXES = {
    vehicleName: 'Araç: ',
    weightLabel: 'Ağırlık: ',
    typeLabel: 'Tür: ',
    scheduleText: 'Randevu: ',
} as const;

export type ParsedOrderNote = {
    vehicleName: string | null;
    weightLabel: string | null;
    typeLabel: string | null;
    scheduleText: string | null;
    freeform: string;
};

export const parseOrderNote = (note?: string | null): ParsedOrderNote => {
    const result: ParsedOrderNote = { vehicleName: null, weightLabel: null, typeLabel: null, scheduleText: null, freeform: '' };
    const rest: string[] = [];
    for (const part of (note || '').split('|').map((p) => p.trim()).filter(Boolean)) {
        const entry = (Object.entries(NOTE_PREFIXES) as [keyof typeof NOTE_PREFIXES, string][]).find(([, prefix]) =>
            part.startsWith(prefix),
        );
        if (entry) result[entry[0]] = part.slice(entry[1].length).trim() || null;
        else rest.push(part);
    }
    result.freeform = rest.join(' | ');
    return result;
};

const extractVehicleName = (note?: string | null): string | null => parseOrderNote(note).vehicleName;

const formatOrderAddress = (loc: any): string =>
    [loc?.addressText, loc?.neighborhood, loc?.district].filter(Boolean).join(', ') || '—';

export const transformOrder = (order: any): TransformedJob => {
    const vehicleName = extractVehicleName(order.cargoDetails?.note);
    return {
        id: order.id,
        type: order.serviceType === 'Hemen' ? 'hemen' : 'randevulu',
        status: ORDER_STATUS_MAP[order.status] || 'bekliyor',
        courierName: order.carrierInfo?.name?.trim() || 'Henüz atanmadı',
        courierConversationId: null,
        vehicleType: vehicleName || VEHICLE_TYPE_NAMES[order.carrierType?.toLowerCase()] || 'Araç',
        vehicleKey: vehicleName?.toLowerCase() || order.carrierType?.toLowerCase() || 'courier',
        from: formatOrderAddress(order.pickupLocation),
        to: formatOrderAddress(order.dropoffLocation),
        dateTime: formatDateTime(order),
        totalAmount: `${order.pricing?.total ?? 0} ₺`,
        distanceKm: null,
        createdAt: order.createdAt || '',
    };
};
