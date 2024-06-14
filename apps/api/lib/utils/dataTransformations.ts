export const transformIdFields = (doc: any) => {
    if (Array.isArray(doc)) {
        return doc.map(transformIdFields);
    } else if (doc && typeof doc === 'object') {
        if (doc._id) {
            doc.id = doc._id.toString();
            delete doc._id;
        }
        for (const key in doc) {
            if (doc.hasOwnProperty(key)) {
                doc[key] = transformIdFields(doc[key]);
            }
        }
    }
    return doc;
};
