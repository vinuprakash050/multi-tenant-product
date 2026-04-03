export const demoVendors = [
  {
    id: 'vendor-a',
    name: 'Northstar Living',
    tagline: 'Modern essentials for homes that move fast and still feel personal.',
    description: 'A clean lifestyle brand focused on practical home and desk products.',
  },
  {
    id: 'vendor-b',
    name: 'PeakTrail Outfitters',
    tagline: 'Gear that keeps outdoor-focused vendors ready for every next trip.',
    description: 'An outdoor brand selling durable accessories, hydration items, and travel gear.',
  },
];

export const demoProducts = [
  {
    id: 'prod-1',
    vendorId: 'vendor-a',
    vendorName: 'Northstar Living',
    name: 'Aura Desk Lamp',
    description: 'A warm ambient desk lamp with touch controls and adjustable brightness.',
    category: 'Lighting',
    price: 69,
    inStock: true,
    featured: true,
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'prod-2',
    vendorId: 'vendor-a',
    vendorName: 'Northstar Living',
    name: 'Cloud Storage Ottoman',
    description: 'Soft upholstered seating with hidden storage for blankets, books, and extras.',
    category: 'Furniture',
    price: 129,
    inStock: true,
    featured: true,
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'prod-3',
    vendorId: 'vendor-b',
    vendorName: 'PeakTrail Outfitters',
    name: 'TrailHydra Bottle',
    description: 'Insulated stainless steel bottle designed for long hikes and hot weather.',
    category: 'Hydration',
    price: 34,
    inStock: true,
    featured: true,
    image:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'prod-4',
    vendorId: 'vendor-b',
    vendorName: 'PeakTrail Outfitters',
    name: 'Summit Pack 24L',
    description: 'Compact daypack with breathable straps, side pockets, and laptop sleeve.',
    category: 'Bags',
    price: 89,
    inStock: false,
    featured: false,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  },
];

export const demoOrders = [
  {
    id: 'ORD-1001',
    vendorId: 'vendor-a',
    customer: {
      name: 'Aarav Mehta',
      email: 'aarav@example.com',
      phone: '+91 9876543210',
      address: '14 MG Road, Bengaluru',
    },
    items: [
      {
        id: 'prod-1',
        name: 'Aura Desk Lamp',
        quantity: 1,
      },
    ],
    total: 69,
    status: 'payment-confirmed',
  },
];
