// Constants for review form dropdowns
// admin-panel/src/lib/constants.ts

export const PRODUCT_TYPES = [
    { value: 'pet_bottle', label: 'PET Bottle' },
    { value: 'carry_bag', label: 'Carry Bag' },
    { value: 'disposable_cup', label: 'Disposable Cup' },
    { value: 'disposable_plate', label: 'Disposable Plate' },
    { value: 'cutlery', label: 'Cutlery' },
    { value: 'food_container', label: 'Food Container' },
    { value: 'straw', label: 'Straw' },
    { value: 'wrapper', label: 'Wrapper/Packaging' },
    { value: 'other', label: 'Other' },
] as const;

export const PLASTIC_TYPES = [
    {
        value: 'PETE_1',
        label: 'PETE/PET (1) - Polyethylene Terephthalate',
        code: 1,
        icon: '♻️'
    },
    {
        value: 'HDPE_2',
        label: 'HDPE (2) - High-Density Polyethylene',
        code: 2,
        icon: '♻️'
    },
    {
        value: 'PVC_3',
        label: 'PVC (3) - Polyvinyl Chloride',
        code: 3,
        icon: '♻️'
    },
    {
        value: 'LDPE_4',
        label: 'LDPE (4) - Low-Density Polyethylene',
        code: 4,
        icon: '♻️'
    },
    {
        value: 'PP_5',
        label: 'PP (5) - Polypropylene',
        code: 5,
        icon: '♻️'
    },
    {
        value: 'PS_6',
        label: 'PS (6) - Polystyrene',
        code: 6,
        icon: '♻️'
    },
    {
        value: 'OTHER_7',
        label: 'Other (7) - Other Plastics',
        code: 7,
        icon: '♻️'
    },
    {
        value: 'UNKNOWN',
        label: 'Unknown - Not Identifiable',
        code: null,
        icon: '❓'
    },
] as const;

export const RECYCLABILITY_INDICATORS = [
    {
        value: 'high',
        label: 'High - Easily Recyclable',
        color: 'blue',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-300',
        description: 'Widely accepted by local recycling facilities'
    },
    {
        value: 'medium',
        label: 'Medium - Limited Recycling',
        color: 'orange',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-300',
        description: 'Some recycling facilities accept this'
    },
    {
        value: 'low',
        label: 'Low - Rarely Recycled',
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-300',
        description: 'Rarely accepted by local facilities'
    },
] as const;

// Type exports
export type ProductType = typeof PRODUCT_TYPES[number]['value'];
export type PlasticType = typeof PLASTIC_TYPES[number]['value'];
export type RecyclabilityIndicator = typeof RECYCLABILITY_INDICATORS[number]['value'];
