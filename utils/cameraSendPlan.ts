export const CAMERA_SEND_BATCH_SIZE = 4;

export type CameraSendPhoto = { uri: string; caption?: string };
export type CameraSendPlanItem = { images: string[]; text: string };

export function planCameraSend(photos: CameraSendPhoto[]): CameraSendPlanItem[] {
    if (!photos.length) return [];

    const captioned = photos.filter((p) => p.caption?.trim());
    if (captioned.length > 1) {
        return photos.map((p) => ({ images: [p.uri], text: p.caption?.trim() ?? '' }));
    }

    const singleCaption = captioned[0]?.caption?.trim() ?? '';
    const uris = photos.map((p) => p.uri);
    const chunks: string[][] = [];
    for (let i = 0; i < uris.length; i += CAMERA_SEND_BATCH_SIZE) {
        chunks.push(uris.slice(i, i + CAMERA_SEND_BATCH_SIZE));
    }

    return chunks.map((images, i) => ({
        images,
        text: i === chunks.length - 1 ? singleCaption : '',
    }));
}
