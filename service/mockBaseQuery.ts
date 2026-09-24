// Geçici mock backend — yeni backend gelince bu dosya + mockData.ts silinip USE_MOCK_API kapatılır.
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { MockMessage } from "./mockData";
import {
  MOCK_ROUTE,
  MOCK_USER,
  isMockAccessToken,
  MOCK_VEHICLES,
  SEED_ADDRESSES,
  SEED_JOBS,
  SEED_NOTIFICATIONS,
  addComplaint,
  addComplaintMessage,
  addConversationMessage,
  addStoredAddress,
  addStoredCard,
  addStoredJob,
  clearStoredJobs,
  deleteConversation,
  getComplaint,
  getComplaints,
  restoreComplaints,
  dismissAddressIds,
  dismissJobIds,
  dismissNotificationIds,
  estimatePrice,
  getConversationList,
  getConversationMedia,
  getConversationMessages,
  getDefaultCardId,
  isConversationBlocked,
  restoreDeletedConversations,
  setConversationFlags,
  getDismissedAddressIds,
  getDismissedJobIds,
  getDismissedNotificationIds,
  getConnectedProviders,
  getSocialAccountLabel,
  getStoredAddresses,
  getStoredCards,
  getStoredJobs,
  getUserLocation,
  setUserLocation,
  markConversationRead,
  pickChatReply,
  removeStoredAddress,
  removeStoredCard,
  searchMessages,
  restoreDismissedAddresses,
  restoreDismissedJobs,
  restoreDismissedNotifications,
  restoreMessages,
  setDefaultCardId,
  setProviderConnected,
  SocialProvider,
  SEED_VEHICLE_LISTINGS,
  EXTRA_VEHICLE_LISTINGS,
  MOCK_TICARIM_CATEGORIES,
  MOCK_TICARIM_BRANDS,
  MOCK_TICARIM_MODELS,
  MOCK_TICARIM_VEHICLE_TYPES,
  accountKey,
  addStoredListing,
  getStoredListings,
  removeStoredListing,
  getFavoriteListingIds,
  toggleFavoriteListingId,
  setDynamicConversationMeta,
  SEED_BANNERS,
  getPresence,
  setPresence,
  getNotificationSettings,
  setNotificationSettings,
  resetNotificationSettings,
  getStorageSettings,
  setStorageSettings,
  getStorageUsage,
  getNetworkUsage,
  addFeedback,
  addDeleteAccountRequest,
  updateStoredJob,
  SEED_ORDERS,
  getStoredOrders,
  addStoredOrder,
} from "./mockData";
import { CATEGORY_KEY_TO_ID } from "@/utils/ticarim";

type Ctx = { url: string; method: string; body: any; params: string[]; email: string; isMock: boolean };
type Handler = (ctx: Ctx) => any | Promise<any>;
type Route = { method: string; pattern: RegExp; handler: Handler };

const ok = (data: any) => ({ data });
const fail = (status: number, message: string): { error: FetchBaseQueryError } => ({
  error: { status, data: { message, success: false } } as any,
});

const routes: Route[] = [
  // ── Profil ──
  { method: "GET", pattern: /\/api\/User\/profile$/, handler: () => ok({ data: MOCK_USER }) },
  {
    method: "PUT",
    pattern: /\/api\/User\/profile$/,
    handler: ({ body }) => ok({ success: true, data: { ...MOCK_USER, ...body } }),
  },
  {
    method: "POST",
    pattern: /\/api\/User\/avatar$/,
    handler: () => ok({ success: true, data: { avatarUrl: "https://i.pravatar.cc/300?img=12" } }),
  },

  // ── Kullanıcı konumu ── (gerçek uçlar yok, bkz. issuesProblemsAgain.md)
  {
    method: "GET",
    pattern: /\/api\/User\/location$/,
    handler: async ({ email }) => ok({ data: await getUserLocation(email) }),
  },
  {
    method: "PUT",
    pattern: /\/api\/User\/location$/,
    handler: async ({ body, email }) => {
      const loc = {
        latitude: body?.latitude,
        longitude: body?.longitude,
        address: body?.address || "",
        city: body?.city || "",
        district: body?.district || "",
        neighborhood: body?.neighborhood || "",
      };
      await setUserLocation(loc, email);
      return ok({ success: true, data: loc, message: "Konum güncellendi." });
    },
  },

  // ── Ödeme yöntemleri ──
  {
    method: "GET",
    pattern: /\/api\/User\/payment-methods$/,
    handler: async () => {
      const cards = await getStoredCards();
      const defaultId = await getDefaultCardId();
      return ok({ data: cards.map((c) => ({ ...c, is_default: c.id === defaultId })) });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/User\/payment-methods$/,
    handler: async ({ body }) => {
      const digits = String(body?.card_number || "");
      const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : digits.startsWith("9792") ? "Troy" : "Kart";
      const card = {
        id: `card-${Date.now()}`,
        brand,
        last4: digits.slice(-4) || "0000",
        card_holder_name: body?.card_holder_name || "",
        expiry_month: body?.expiry_month ?? null,
        expiry_year: body?.expiry_year ?? null,
      };
      await addStoredCard(card);
      return ok({ success: true, data: card });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/User\/payment-methods\/([^/]+)\/default$/,
    handler: async ({ params }) => {
      await setDefaultCardId(params[0]);
      return ok({ success: true });
    },
  },
  {
    method: "DELETE",
    pattern: /\/api\/User\/payment-methods\/([^/]+)$/,
    handler: async ({ params }) => {
      await removeStoredCard(params[0]);
      return ok({ success: true });
    },
  },

  // ── Hesap bağlantıları ──
  {
    method: "GET",
    pattern: /\/api\/User\/social-accounts$/,
    handler: async () => {
      const connected = await getConnectedProviders();
      const providers: SocialProvider[] = ["google", "apple", "facebook"];
      const data = providers.map((provider) => ({
        provider,
        connected: !!connected[provider],
        accountLabel: connected[provider] ? getSocialAccountLabel(provider) : null,
      }));
      return ok({ data });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/User\/social-accounts\/([^/]+)$/,
    handler: async ({ params }) => {
      const provider = params[0] as SocialProvider;
      await setProviderConnected(provider, true);
      return ok({ success: true, data: { provider, connected: true, accountLabel: getSocialAccountLabel(provider) } });
    },
  },
  {
    method: "DELETE",
    pattern: /\/api\/User\/social-accounts\/([^/]+)$/,
    handler: async ({ params }) => {
      const provider = params[0] as SocialProvider;
      await setProviderConnected(provider, false);
      return ok({ success: true });
    },
  },

  // ── Ticarim (araç ilan pazarı) ──
  {
    method: "GET",
    pattern: /\/api\/ticarim\/categories$/,
    handler: async ({ email, isMock }) => {
      const stored = (await getStoredListings()).filter((l: any) => l.ownerEmail === accountKey(email));
      const all: any[] = [...stored, ...(isMock ? [...SEED_VEHICLE_LISTINGS, ...EXTRA_VEHICLE_LISTINGS] : [])];
      const categories = MOCK_TICARIM_CATEGORIES.map((c) => ({
        ...c,
        active_listing_count: all.filter((l) =>
          l.category_id ? l.category_id === c.id : CATEGORY_KEY_TO_ID[l.category as keyof typeof CATEGORY_KEY_TO_ID] === c.id,
        ).length,
      }));
      return ok({ categories });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/ticarim\/brands(\?.*)?$/,
    handler: ({ url }) => {
      const qs = new URLSearchParams(url.split("?")[1] || "");
      const categoryId = qs.get("categoryId");
      const brands = categoryId
        ? MOCK_TICARIM_BRANDS[categoryId] || []
        : Object.values(MOCK_TICARIM_BRANDS).flat();
      return ok({ brands });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/ticarim\/models(\?.*)?$/,
    handler: ({ url }) => {
      const qs = new URLSearchParams(url.split("?")[1] || "");
      const brandId = qs.get("brandId");
      const categoryId = qs.get("categoryId");

      let models = brandId ? MOCK_TICARIM_MODELS[brandId] || [] : Object.values(MOCK_TICARIM_MODELS).flat();
      if (categoryId) models = models.filter((m) => m.category_id === categoryId);
      return ok({ models });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/ticarim\/vehicle-types(\?.*)?$/,
    handler: ({ url }) => {
      const qs = new URLSearchParams(url.split("?")[1] || "");
      const categoryId = qs.get("categoryId");
      return ok({ vehicle_types: categoryId ? MOCK_TICARIM_VEHICLE_TYPES[categoryId] || [] : [] });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/ticarim\/listings(\?.*)?$/,
    handler: async ({ url, email, isMock }) => {
      const qs = new URLSearchParams(url.split("?")[1] || "");
      const categoryId = qs.get("categoryId");
      const q = (qs.get("q") || "").trim().toLowerCase();
      const stored = (await getStoredListings()).filter((l: any) => l.ownerEmail === accountKey(email));
      let all: any[] = [...stored, ...(isMock ? [...SEED_VEHICLE_LISTINGS, ...EXTRA_VEHICLE_LISTINGS] : [])];
      if (categoryId) {
        all = all.filter((l) =>
          l.category_id ? l.category_id === categoryId : CATEGORY_KEY_TO_ID[l.category as keyof typeof CATEGORY_KEY_TO_ID] === categoryId,
        );
      }
      if (q) {
        all = all.filter((l) =>
          [l.title, l.brand, l.model, l.brand_name, l.model_name].some((f) => (f || "").toLowerCase().includes(q)),
        );
      }
      return ok({ listings: all });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/ticarim\/my-listings$/,
    handler: async ({ email }) => {
      const stored = (await getStoredListings()).filter((l: any) => l.ownerEmail === accountKey(email));
      return ok({ listings: stored });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/ticarim\/listings\/([^/]+)$/,
    handler: async ({ params, isMock }) => {
      const stored = await getStoredListings();
      const all = [...stored, ...(isMock ? [...SEED_VEHICLE_LISTINGS, ...EXTRA_VEHICLE_LISTINGS] : [])];
      const listing = all.find((l) => String(l.id) === params[0]);
      if (!listing) return fail(404, "İlan bulunamadı");
      return ok({ listing });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/ticarim\/listings$/,
    handler: async ({ body, email }) => {
      const listing = {
        id: `lst-${Date.now()}`,
        created_at: new Date().toISOString(),
        status: "Active",
        ...body,
        images: (body?.images || []).map((img: any, i: number) => ({
          id: `img-${Date.now()}-${i}`,
          media_image_id: img.media_image_id,
          image_url: img.image_url || img.url || "",
          sort_order: img.sort_order ?? i,
          is_cover: img.is_cover ?? i === 0,
        })),
        ownerEmail: accountKey(email),
      };
      await addStoredListing(listing);
      return ok({ success: true, listing_id: listing.id, status: listing.status });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/ticarim\/listings\/([^/]+)\/publish$/,
    handler: () => ok({ success: true }),
  },
  {
    method: "DELETE",
    pattern: /\/api\/ticarim\/listings\/([^/]+)$/,
    handler: async ({ params }) => {
      await removeStoredListing(params[0]);
      return ok({ success: true });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/ticarim\/favorites$/,
    handler: async () => ok({ data: await getFavoriteListingIds() }),
  },
  {
    method: "POST",
    pattern: /\/api\/ticarim\/favorites\/([^/]+)\/toggle$/,
    handler: async ({ params }) => ok({ data: await toggleFavoriteListingId(params[0]) }),
  },

  // ── Araçlar ──
  { method: "GET", pattern: /\/api\/Vehicle$/, handler: () => ok({ data: MOCK_VEHICLES }) },
  { method: "GET", pattern: /\/api\/User\/banners$/, handler: ({ isMock }) => ok({ data: isMock ? SEED_BANNERS : [] }) },

  // ── Yük / gönderi ──
  {
    method: "POST",
    pattern: /\/api\/User\/jobs\/price-estimate$/,
    handler: ({ body }) => ok({ data: { estimatedPrice: estimatePrice(body) } }),
  },
  {
    method: "POST",
    pattern: /\/api\/User\/jobs\/cargo-scan$/,
    handler: () =>
      ok({
        data: {
          id: `mock-img-${Date.now()}`,
          original_vehicle: "MINIVAN",
          suggested_capacity_id: 3,
          suggested_type_id: 4,
          suggested_notes:
            "Fotoğraflara göre orta boy, kırılabilir olmayan katı bir yük tespit edildi. Standart istifleme yeterlidir.",
        },
        message: "Yük analizi tamamlandı",
      }),
  },
  {
    method: "POST",
    pattern: /\/api\/media\/upload$/,
    handler: () =>
      ok({
        images: [
          {
            id: `mock-media-${Date.now()}`,
            url: "https://picsum.photos/seed/yuksi/400",
            handle: "mock",
            file_name: "mock.jpg",
            content_type: "image/jpeg",
            byte_size: 0,
            storage_provider: "Mock",
            created_at: new Date().toISOString(),
          },
        ],
        message: "1 görsel yüklendi (mock)",
      }),
  },
  {
    method: "POST",
    pattern: /\/api\/User\/jobs$/,
    handler: async ({ body }) => {
      const now = new Date();
      const job = {
        id: `job-${Date.now()}`,
        jobStatus: "pending",
        courierName: "",
        deliveryType: body?.delivery_type || "immediate",
        carrierType: body?.carrier_type || "courier",
        vehicleType: body?.carrier_type || "courier",
        pickupAddress: body?.pickup_address || "",
        dropoffAddress: body?.dropoff_address || "",
        totalPrice: body?.total_price ?? 0,
        specialNotes: body?.special_notes ?? null,
        createdAt: now.toISOString(),
      };
      await addStoredJob(job);
      return ok({ success: true, data: job });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/User\/jobs$/,
    handler: async ({ isMock }) => {
      const stored = await getStoredJobs();
      const dismissed = await getDismissedJobIds();
      const all = [...stored, ...(isMock ? SEED_JOBS : [])].filter((j) => !dismissed.includes(String(j.id)));
      return ok({ data: all });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/User\/jobs\/clear$/,
    handler: async ({ isMock }) => {
      const stored = await getStoredJobs();
      const allIds = [...stored, ...(isMock ? SEED_JOBS : [])].map((j) => String(j.id));
      await dismissJobIds(allIds);
      await clearStoredJobs();
      return ok({ success: true });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/User\/jobs\/restore$/,
    handler: async () => {
      await restoreDismissedJobs();
      return ok({ success: true });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/User\/jobs\/([^/]+)$/,
    handler: async ({ params, isMock }) => {
      const stored = await getStoredJobs();
      const job = [...stored, ...(isMock ? SEED_JOBS : [])].find((j) => String(j.id) === params[0]);
      if (!job) return fail(404, "Gönderi bulunamadı");
      return ok({ data: job });
    },
  },
  {
    method: "PATCH",
    pattern: /\/api\/User\/jobs\/([^/]+)\/assign-courier$/,
    handler: async ({ params, body }) => {
      const job = await updateStoredJob(params[0], body);
      if (!job) return fail(404, "Gönderi bulunamadı");
      return ok({ success: true, data: job });
    },
  },

  // ── Siparişler (yeni Orders API — henüz gerçek backend'e bağlı değil, bkz. issuesProblemsAgain.md) ──
  {
    method: "GET",
    pattern: /\/api\/orders\/active(\?.*)?$/,
    handler: async ({ url }) => {
      const qs = new URLSearchParams(url.split("?")[1] || "");
      const filter = (qs.get("filter") || "").toLowerCase();
      const stored = await getStoredOrders();
      let all = [...stored, ...SEED_ORDERS].filter(
        (o) => o.status !== "Tamamlandı" && o.status !== "İptal" && o.status !== "Başarısız",
      );
      if (filter) {
        const now = Date.now();
        const cutoffMs =
          filter === "today" ? 24 * 60 * 60 * 1000 :
          filter === "week" ? 7 * 24 * 60 * 60 * 1000 :
          filter === "month" ? 30 * 24 * 60 * 60 * 1000 : 0;
        if (cutoffMs) all = all.filter((o) => now - new Date(o.createdAt).getTime() <= cutoffMs);
      }
      return ok(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    },
  },
  {
    method: "GET",
    pattern: /\/api\/orders\/completed(\?.*)?$/,
    handler: async ({ url }) => {
      const qs = new URLSearchParams(url.split("?")[1] || "");
      const page = Number(qs.get("page")) || 1;
      const limit = Number(qs.get("limit")) || 10;
      const stored = await getStoredOrders();
      const all = [...stored, ...SEED_ORDERS]
        .filter((o) => o.status === "Tamamlandı" || o.status === "İptal" || o.status === "Başarısız")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const totalCount = all.length;
      const data = all.slice((page - 1) * limit, page * limit);
      return ok({ page, limit, totalCount, data });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/orders\/([^/?]+)$/,
    handler: async ({ params }) => {
      const stored = await getStoredOrders();
      const order = [...stored, ...SEED_ORDERS].find((o) => o.id === params[0]);
      if (!order) return fail(404, "Sipariş bulunamadı.");
      return ok(order);
    },
  },
  {
    method: "POST",
    pattern: /\/api\/orders$/,
    handler: async ({ body }) => {
      const id = `order-${Date.now()}`;
      const now = new Date().toISOString();
      const order = {
        id,
        orderNumber: body?.orderNumber || id,
        userId: body?.userId || MOCK_USER.userId,
        status: "Bekliyor",
        serviceType: body?.serviceType || "Hemen",
        carrierType: body?.carrierType || "",
        pickupLocation: body?.pickupLocation || {},
        dropoffLocation: body?.dropoffLocation || {},
        cargoDetails: body?.cargoDetails || {},
        pricing: body?.pricing || {},
        carrierInfo: null,
        statusHistories: [{ id: 1, orderId: id, status: "Bekliyor", timestamp: now }],
        createdAt: now,
        updatedAt: now,
      };
      await addStoredOrder(order);
      return ok(order);
    },
  },

  // ── Bildirimler ──
  {
    method: "GET",
    pattern: /\/api\/Notifications$/,
    handler: async ({ isMock }) => {
      const dismissed = await getDismissedNotificationIds();
      const visible = (isMock ? SEED_NOTIFICATIONS : []).filter((n) => !dismissed.includes(n.id));
      return ok({ data: visible });
    },
  },
  {
    method: "DELETE",
    pattern: /\/api\/Notifications\/([^/]+)$/,
    handler: async ({ params }) => {
      await dismissNotificationIds([params[0]]);
      return ok({ success: true });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/Notifications\/([^/]+)\/deliver$/,
    handler: async () => ok({ success: true }),
  },
  {
    method: "POST",
    pattern: /\/api\/Notifications\/([^/]+)\/read$/,
    handler: async () => ok({ success: true }),
  },
  {
    method: "POST",
    pattern: /\/api\/User\/notifications\/restore$/,
    handler: async () => {
      await restoreDismissedNotifications();
      return ok({ success: true });
    },
  },

  // ── Adresler (gerçek backend'de "saved-routes") ──
  {
    method: "GET",
    pattern: /\/api\/user\/saved-routes$/,
    handler: async ({ isMock }) => {
      const stored = await getStoredAddresses();
      const dismissed = await getDismissedAddressIds();
      const all = [...stored, ...(isMock ? SEED_ADDRESSES : [])].filter((a) => !dismissed.includes(String(a.id)));
      return ok({ data: all });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/user\/saved-routes$/,
    handler: async ({ body }) => {
      const addr = { id: `addr-${Date.now()}`, ...body };
      await addStoredAddress(addr);
      return ok({ success: true, data: addr });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/user\/addresses\/restore$/,
    handler: async () => {
      await restoreDismissedAddresses();
      return ok({ success: true });
    },
  },
  {
    method: "DELETE",
    pattern: /\/api\/user\/saved-routes\/([^/]+)$/,
    handler: async ({ params }) => {
      await removeStoredAddress(params[0]);
      await dismissAddressIds([params[0]]);
      return ok({ success: true });
    },
  },

  // ── Çevrimiçi durumu (presence) ──
  {
    method: "GET",
    pattern: /\/api\/User\/presence$/,
    handler: async ({ email }) => ok({ data: await getPresence(email) }),
  },
  {
    method: "PUT",
    pattern: /\/api\/User\/presence$/,
    handler: async ({ body, email }) => ok({ success: true, data: await setPresence(body || {}, email) }),
  },

  // ── Bildirim ayarları ──
  {
    method: "GET",
    pattern: /\/api\/User\/notificationsettings$/,
    handler: async ({ email }) => ok({ data: await getNotificationSettings(email) }),
  },
  {
    method: "PUT",
    pattern: /\/api\/User\/notificationsettings$/,
    handler: async ({ body, email }) => ok({ success: true, data: await setNotificationSettings(body || {}, email) }),
  },
  {
    method: "POST",
    pattern: /\/api\/User\/notificationsettings\/reset$/,
    handler: async ({ email }) => ok({ success: true, data: await resetNotificationSettings(email) }),
  },

  // ── Depolama ve veri ──
  {
    method: "GET",
    pattern: /\/api\/User\/storage-settings$/,
    handler: async ({ email }) => ok({ data: await getStorageSettings(email) }),
  },
  {
    method: "PUT",
    pattern: /\/api\/User\/storage-settings$/,
    handler: async ({ body, email }) => ok({ success: true, data: await setStorageSettings(body || {}, email) }),
  },
  {
    method: "GET",
    pattern: /\/api\/User\/storage-usage$/,
    handler: async () => ok({ data: await getStorageUsage() }),
  },
  {
    method: "GET",
    pattern: /\/api\/User\/network-usage$/,
    handler: async () => ok({ data: await getNetworkUsage() }),
  },

  // ── Geribildirim ──
  {
    method: "POST",
    pattern: /\/api\/feedback$/,
    handler: async ({ body, email }) =>
      ok({
        success: true,
        data: await addFeedback(
          { message: String(body?.message || ""), rating: typeof body?.rating === "number" ? body.rating : undefined },
          email,
        ),
      }),
  },

  // ── Hesap silme talebi ──
  {
    method: "POST",
    pattern: /\/api\/account\/delete-request$/,
    handler: async ({ body, email }) =>
      ok({
        success: true,
        data: await addDeleteAccountRequest(
          { reason: String(body?.reason || ""), details: body?.details ? String(body.details) : undefined },
          email,
        ),
      }),
  },

  // ── Mesajlar (birebir sohbet) — yalnızca mock oturumunda ──
  {
    method: "GET",
    pattern: /\/api\/messages\/conversations$/,
    handler: async ({ email, isMock }) => ok({ data: isMock ? await getConversationList(email) : [] }),
  },
  {
    method: "POST",
    pattern: /\/api\/messages\/conversations$/,
    handler: async ({ body, email, isMock }) => {
      if (!isMock) return fail(404, "Kullanıcı bulunamadı");
      const id = `conv-user-${body?.other_user_id || Date.now()}`;
      await setDynamicConversationMeta(id, { name: "Kullanıcı", avatar: null }, email);
      return ok({ data: { id, name: "Kullanıcı", avatar: null, lastMessage: "", time: "", unread: 0, status: "offline" } });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/messages\/blocked$/,
    handler: async ({ email, isMock }) => {
      if (!isMock) return ok({ data: [] });
      const list = await getConversationList(email);
      return ok({ data: list.filter((c) => c.blocked) });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/messages\/search$/,
    handler: async ({ body, email, isMock }) =>
      ok({ data: isMock ? await searchMessages(String(body?.query ?? body?.q ?? ""), email) : [] }),
  },
  {
    method: "POST",
    pattern: /\/api\/messages\/conversations\/restore$/,
    handler: async () => {
      await restoreDeletedConversations();
      return ok({ success: true });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/messages\/conversations\/([^/?]+)\/media$/,
    handler: async ({ params, email, isMock }) =>
      ok({ data: isMock ? await getConversationMedia(params[0], email) : { media: [], links: [] } }),
  },
  {
    method: "POST",
    pattern: /\/api\/messages\/conversations\/([^/?]+)\/flags$/,
    handler: async ({ params, body, email }) => {
      const patch: { blocked?: boolean; muted?: boolean } = {};
      if (typeof body?.blocked === "boolean") patch.blocked = body.blocked;
      if (typeof body?.muted === "boolean") patch.muted = body.muted;
      const updated = await setConversationFlags(params[0], patch, email);
      return ok({ success: true, data: updated });
    },
  },
  {
    method: "DELETE",
    pattern: /\/api\/messages\/conversations\/([^/?]+)$/,
    handler: async ({ params, email }) => {
      await deleteConversation(params[0], email);
      return ok({ success: true });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/messages\/conversations\/([^/?]+)\/messages(\?.*)?$/,
    handler: async ({ params, email, isMock }) => {
      if (!isMock) return ok({ data: [] });
      await markConversationRead(params[0], email);
      return ok({ data: await getConversationMessages(params[0], email) });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/messages\/conversations\/([^/?]+)\/messages$/,
    handler: async ({ params, body, email, isMock }) => {
      if (!isMock) return fail(404, "Sohbet bulunamadı");
      if (await isConversationBlocked(params[0], email)) {
        return fail(403, "Bu kişiye mesaj gönderemezsiniz");
      }
      const CALL_STATUSES = ["completed", "missed", "cancelled", "declined"] as const;
      const msg: MockMessage = {
        id: `m-${Date.now()}`,
        text: String(body?.text || "").trim(),
        call: body?.call_status != null
          ? {
              direction: body?.call_direction === 1 ? "out" : "in",
              status: CALL_STATUSES[body?.call_status] || "completed",
              durationSec: body?.call_duration_sec || 0,
            }
          : null,
        side: "me" as const,
        createdAt: new Date().toISOString(),
      };
      await addConversationMessage(params[0], msg, email);
      return ok({ success: true, data: msg });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/messages\/restore$/,
    handler: async () => {
      await restoreMessages();
      return ok({ success: true });
    },
  },

  // ── Şikayetler ──
  {
    method: "GET",
    pattern: /\/api\/complaints$/,
    handler: async ({ email, isMock }) => ok({ data: await getComplaints(email, isMock) }),
  },
  {
    method: "POST",
    pattern: /\/api\/complaints\/restore$/,
    handler: async () => {
      await restoreComplaints();
      return ok({ success: true });
    },
  },
  {
    method: "POST",
    pattern: /\/api\/complaints\/([^/?]+)\/messages$/,
    handler: async ({ params, body, email }) => {
      const msg = await addComplaintMessage(email, params[0], body?.text || "");
      return ok({ success: true, data: msg });
    },
  },
  {
    method: "GET",
    pattern: /\/api\/complaints\/([^/?]+)$/,
    handler: async ({ params, email, isMock }) => {
      const c = await getComplaint(params[0], email, isMock);
      return c ? ok({ data: c }) : fail(404, "Şikayet bulunamadı");
    },
  },
  {
    method: "POST",
    pattern: /\/api\/complaints$/,
    handler: async ({ body, email }) => ok({ success: true, data: await addComplaint(email, body || {}) }),
  },

  // ── Chatbot ──
  {
    method: "POST",
    pattern: /\/api\/cargo\/chat$/,
    handler: ({ body }) =>
      ok({
        response: pickChatReply(body?.message),
        session_id: body?.session_id || body?.sessionId || "mock-session",
      }),
  },

  // ── Kurye canlı rota (ham obje döner) ──
  {
    method: "GET",
    pattern: /\/map\/route\/courier\/([^/]+)$/,
    handler: () => ok(MOCK_ROUTE),
  },
];

const parseBody = (raw: any) => {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  // FormData (yük fotoğrafı / avatar) — mock için içeriği önemsiz
  if (typeof FormData !== "undefined" && raw instanceof FormData) return {};
  return raw;
};

export const mockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  mockApi,
) => {
  const url = typeof args === "string" ? args : args.url;
  const method = (typeof args === "string" ? "GET" : args.method || "GET").toUpperCase();
  const body = typeof args === "string" ? undefined : parseBody(args.body);
  const session = (mockApi?.getState?.() as any)?.userSlice?.userSession;
  const email: string = session?.email || "";
  const isMock = isMockAccessToken(session?.accessToken);

  // gerçek istek hissi için küçük gecikme (loading state'leri görünür kalsın)
  await new Promise((r) => setTimeout(r, 150));

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = url.match(route.pattern);
    if (!match) continue;
    try {
      return await route.handler({ url, method, body, params: match.slice(1), email, isMock });
    } catch (e: any) {
      return fail(500, e?.message || "Mock backend hatası");
    }
  }

  if (__DEV__) console.warn(`[mockBaseQuery] eşleşmeyen istek: ${method} ${url}`);
  return { data: {} };
};
