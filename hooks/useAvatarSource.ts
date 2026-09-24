import { useEffect, useState } from 'react';

export function useAvatarSource(remoteUri?: string | null, localUri?: string | null) {
    const [remoteFailed, setRemoteFailed] = useState(false);
    const [localFailed, setLocalFailed] = useState(false);

    useEffect(() => setRemoteFailed(false), [remoteUri]);
    useEffect(() => setLocalFailed(false), [localUri]);

    const usingRemote = !remoteFailed && !!remoteUri;
    const uri = usingRemote ? remoteUri : !localFailed && localUri ? localUri : null;

    const onError = () => {
        if (usingRemote) setRemoteFailed(true);
        else setLocalFailed(true);
    };

    return { uri, onError };
}
