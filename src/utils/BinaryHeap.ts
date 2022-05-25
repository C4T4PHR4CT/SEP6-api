/**
 * Should return true if a is 'greater' than b
 * @param a
 * @param b
 */
type CompareFn<T> = (a: T, b: T) => boolean;

export default class BinaryHeap<T> {
    public get length(): number {
        return this.nodes_.length;
    }

    private nodes_: T[] = [];
    private compareFn_: CompareFn<T>;

    constructor(compareFn: CompareFn<T>) {
        this.compareFn_ = compareFn;
    }

    public push(...args: T[]) {
        const n = args.length;
        let i = -1;
        while (++i < n) {
            this.pushOne(args[i]);
        }
        return n;
    }

    public pushOne(value: T) {
        this.nodes_.push(value);
        this.moveUp_(this.nodes_.length - 1);
    }

    public pop(): T | undefined {
        if (this.nodes_.length === 0) return undefined;

        const result = this.nodes_[0];
        const end = this.nodes_.pop();

        if (this.nodes_.length) {
            this.nodes_[0] = end!;
            this.moveDown_(0);
        }

        return result;
    }

    public peak(): T | undefined {
        return this.nodes_[0];
    }

    public clear() {
        this.nodes_ = [];
    }

    private moveDown_(index: number) {
        const arr = this.nodes_;
        const count = arr.length;

        // Save the node being moved down.
        const node = arr[index];
        // While the current node has a child.
        while (index < count >> 1) {
            const leftChildIndex = this.calcLeftChildIdx_(index);
            const rightChildIndex = this.calcRightChildIdx_(index);

            // Determine the index of the child with the highest 'score'
            const targetChildIndex =
                rightChildIndex < count &&
                this.compareFn_(arr[rightChildIndex], arr[leftChildIndex])
                    ? rightChildIndex
                    : leftChildIndex;

            // If the node being moved down scores higher than its children it's at the right spot
            if (!this.compareFn_(arr[targetChildIndex], node)) {
                break;
            }

            // If not, then swap and take target child as the current node.
            arr[index] = arr[targetChildIndex];
            index = targetChildIndex;
        }
        arr[index] = node;
    }

    private moveUp_(index: number) {
        const arr = this.nodes_;
        const node = arr[index];

        // While the node being moved up is not at the root.
        while (index > 0) {
            const parentIndex = this.calcParentIdx_(index);
            // If the node scores higher then the parrent, move the parent down.
            if (this.compareFn_(node, arr[parentIndex])) {
                arr[index] = arr[parentIndex];
                index = parentIndex;
            } else {
                break;
            }
        }
        arr[index] = node;
    }

    private calcLeftChildIdx_(idx: number) {
        return 2 * idx + 1;
    }
    private calcRightChildIdx_(idx: number) {
        return 2 * idx + 2;
    }
    private calcParentIdx_(idx: number) {
        return (idx - 1) >> 1;
    }
}
