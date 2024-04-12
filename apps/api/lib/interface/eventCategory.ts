export type IEventCategory = {
    id?: string;
    name: string;
    iconName: string;
    description: string;
    color?: string;
    /**
     * Timestamp for when a document is created
     * @type {string}
     */
    createdAt?: string;
    /**
     * Timestamp for when a document is last updated
     * @type {string}
     */
    updatedAt?: string;
};
