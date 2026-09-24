import MinivanSvg from '@/assets/images/vehicles/minivan.svg';
import MotorcycleSvg from '@/assets/images/vehicles/motorcycle.svg';
import PanelvanSvg from '@/assets/images/vehicles/panelvan.svg';
import PickupTruckSvg from '@/assets/images/vehicles/pickup-truck.svg';
import TruckSvg from '@/assets/images/vehicles/truck.svg';

// ─── Vehicle SVG Mapping ─────────────────────────────────────

export const VEHICLE_SVG_MAP: Record<string, any> = {
    courier: MotorcycleSvg,
    motorcycle: MotorcycleSvg,
    motorsiklet: MotorcycleSvg,
    minivan: MinivanSvg,
    panelvan: PanelvanSvg,
    pickup: PickupTruckSvg,
    kamyonet: PickupTruckSvg,
    truck: TruckSvg,
    kamyon: TruckSvg,
};

// ─── Vehicle Display Names ───────────────────────────────────

export const VEHICLE_TYPE_NAMES: Record<string, string> = {
    courier: 'Moto Kurye',
    motorcycle: 'Moto Kurye',
    motorsiklet: 'Moto Kurye',
    minivan: 'Minivan',
    panelvan: 'Panelvan',
    pickup: 'Kamyonet',
    kamyonet: 'Kamyonet',
    truck: 'Kamyon',
    kamyon: 'Kamyon',
};

// ─── Job Status Mapping ──────────────────────────────────────

export const JOB_STATUS_MAP: Record<string, string> = {
    pending: 'bekliyor',
    assigned: 'atandı',
    picked_up: 'teslim_alındı',
    in_progress: 'yolda',
    completed: 'tamamlandı',
    cancelled: 'iptal',
};

// Gerçek backend'in job.status değerleri bu enum'la örtüşmüyor — sadece
// canlıda gözlemlenenler eşlendi, bilinmeyenler JOB_STATUS_MAP'te zaten
// 'bekliyor'a düşüyor. Backend ekibiyle netleşince genişletilmeli.
export const REAL_JOB_STATUS_MAP: Record<string, string> = {
    created: 'pending',
    active: 'assigned',
};

// ─── Status UI Config ────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; bg: string; icon: string }> = {
    bekliyor: { label: 'Bekliyor', bg: 'bg-amber-500', icon: 'time-outline' },
    atandı: { label: 'Kurye Atandı', bg: 'bg-blue-500', icon: 'person-outline' },
    teslim_alındı: { label: 'Teslim Alındı', bg: 'bg-indigo-500', icon: 'cube-outline' },
    yolda: { label: 'Yolda', bg: 'bg-emerald-500', icon: 'navigate-outline' },
    'tamamlandı': { label: 'Tamamlandı', bg: 'bg-orange-500', icon: 'checkmark-circle-outline' },
    iptal: { label: 'İptal', bg: 'bg-red-500', icon: 'close-circle-outline' },
};

// ─── Filter Options ──────────────────────────────────────────

export const FILTER_OPTIONS = [
    { key: 'tümü', label: 'Tümü', icon: 'apps-outline' },
    { key: 'bekliyor', label: 'Bekliyor', icon: 'time-outline' },
    { key: 'atandı', label: 'Atandı', icon: 'person-outline' },
    { key: 'teslim_alındı', label: 'Teslim Alındı', icon: 'cube-outline' },
    { key: 'yolda', label: 'Yolda', icon: 'navigate-outline' },
    { key: 'tamamlandı', label: 'Tamamlandı', icon: 'checkmark-circle-outline' },
] as const;

export const TIME_FILTERS = [
    { key: 'tümü', label: 'Tümü' },
    { key: 'bugün', label: 'Bugün' },
    { key: 'bu-hafta', label: 'Bu Hafta' },
    { key: 'bu-ay', label: 'Bu Ay' },
] as const;

// ─── Status Steps ────────────────────────────────────────────

export const SHIPMENT_STEPS = [
    { id: 'pending', label: 'Sipariş Oluşturuldu' },
    { id: 'assigned', label: 'Kurye Atandı' },
    { id: 'picked_up', label: 'Teslim Alındı' },
    { id: 'in_progress', label: 'Yolda' },
    { id: 'teslim_edildi', label: 'Tamamlandı' },
] as const;
