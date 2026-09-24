import { LocationData } from "@/store/feature/createLoad/slice";

// Backend'in POST /api/user/saved-routes ile beklediği from/to şekli — düz
// adres bileşenleri, uygulamanın LocationData'sından farklı.
export type ApiRouteLocation = {
    title?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment_no?: string;
    latitude?: number;
    longitude?: number;
};

export const toApiLocation = (loc: LocationData): ApiRouteLocation => ({
    title: loc.name || loc.addressDetails?.city || "",
    city: loc.addressDetails?.city || "",
    district: loc.addressDetails?.district || "",
    neighborhood: loc.addressDetails?.neighborhood || "",
    street: loc.addressDetails?.street || "",
    building: loc.addressDetails?.buildingNo || "",
    floor: "",
    apartment_no: loc.addressDetails?.doorNo || "",
    latitude: loc.latitude,
    longitude: loc.longitude,
});

// Backend'den gelen düz adres bileşenlerini uygulamanın kullandığı
// LocationData'ya çevirir. Mock veri zaten LocationData şeklinde geliyor
// (`.address` alanı var) — o durumda dokunmadan geçirir.
export const fromApiLocation = (loc: any): LocationData => {
    if (!loc) return loc;
    if (loc.address !== undefined || loc.addressDetails !== undefined) return loc;

    const line = [loc.street, loc.building].filter(Boolean).join(" ");
    const cityLine = [loc.district, loc.city].filter(Boolean).join("/");
    const address = [line, loc.neighborhood, cityLine].filter(Boolean).join(", ");

    return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address,
        addressDetails: {
            city: loc.city,
            district: loc.district,
            neighborhood: loc.neighborhood,
            street: loc.street,
            buildingNo: loc.building,
            doorNo: loc.apartment_no,
        },
        name: loc.title,
    };
};
