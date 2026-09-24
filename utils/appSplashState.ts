let done = false;
const listeners = new Set<() => void>();

export const markAppSplashDone = () => {
    done = true;
    listeners.forEach((cb) => cb());
    listeners.clear();
};

export const isAppSplashDone = () => done;

export const onAppSplashDone = (cb: () => void) => {
    if (done) {
        cb();
        return () => {};
    }
    listeners.add(cb);
    return () => listeners.delete(cb);
};
