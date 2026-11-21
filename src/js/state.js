// state management
export function createStore(initialState) {
    let state = { ...initialState };
    const listeners = new Set();

    return {
        get: () => state,
        set(patch) {
            const changed = Object.keys(patch).filter(key => state[key] !== patch[key]);
            if (changed.length === 0) return;
            state = { ...state, ...patch };
            listeners.forEach(listener => listener(state, changed));
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
