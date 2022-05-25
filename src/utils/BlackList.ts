import BinaryHeap from "./BinaryHeap";

export type BlackListItem<K extends string | number, V> = {
    key: K;
    /**
     * Expiration time in number of milliseconds elapsed since 1970-01-01T00:00:00Z.
     */
    exp: number;
    value?: V;
};

export default class BlackList<Key extends string | number, Value = undefined> {
    private list_: BinaryHeap<BlackListItem<Key, Value>> = new BinaryHeap(
        (a, b) => a.exp < b.exp
    );
    // Key cache holds keys currently blacklisted
    private keyCache_: Set<Key> = new Set();

    private timer_: NodeJS.Timeout | undefined = undefined;
    private intervalMs_: number;

    public get length() {
        return this.keyCache_.size;
    }

    public constructor(intervalMs = 15000) {
        this.intervalMs_ = intervalMs;
    }

    public push(key: Key, expiresAt: number, value?: Value) {
        this.keyCache_.add(key);
        this.list_.pushOne({ key, exp: expiresAt, value });

        if (this.timer_ === undefined) {
            this.timer_ = setInterval(() => {
                const now = Date.now();

                while (this.list_.length > 0 && this.list_.peak()!.exp < now) {
                    this.keyCache_.delete(this.list_.pop()!.key);
                }

                if (this.list_.length === 0) {
                    clearInterval(this.timer_!);
                    this.timer_ = undefined;
                }
            }, this.intervalMs_);
            this.timer_.unref();
        }
    }

    public contains(key: Key) {
        return this.keyCache_.has(key);
    }

    public clear() {
        this.list_.clear();
        this.keyCache_.clear();
        if (this.timer_ !== undefined) {
            clearInterval(this.timer_);
            this.timer_ = undefined;
        }
    }
}
