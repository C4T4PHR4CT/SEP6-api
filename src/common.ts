export function shallowStringify(object: any) {
    const obj = {} as any;
    const keys = Object.keys(object);
    for (const key of keys)
        obj[key] = object[key].toString();
    return JSON.stringify(obj, null, 2);
}