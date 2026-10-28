// Single source of truth for services and starting prices.
// Update prices here and both the Services page and the Booking portal follow.
window.PREMIER = {
  squareUrl: 'https://square.site/book/KCW9EK0D8ZR9M/premier-auto-detailing',
  phone: '(775) 420-8547',
  sizes: [
    { id: 'sedan', label: 'Sedan', hint: 'Cars and coupes' },
    { id: 'medium', label: 'Medium', hint: 'Small SUVs, crossovers, mid-size trucks' },
    { id: 'large', label: 'Large', hint: 'Full-size trucks, 3-row SUVs, vans' }
  ],
  services: [
    {
      id: 'diamond', group: 'Packages', name: 'Diamond package',
      summary: 'Our most complete detail: full interior and exterior, a single-step polish and an engine bay detail.',
      includes: [
        'Wash, clay bar decontamination and 1-step light polish',
        'Water spot and light scratch removal',
        'Sealant that protects the paint for 6 to 12 months',
        'Wheels, tires and all glass cleaned and conditioned',
        'Full engine bay steam clean, belts, hoses and plastics dressed',
        'Interior steam clean and shampoo: carpets, mats, upholstery, headliner',
        'Leather, vinyl and plastics cleaned and conditioned, door jambs detailed'
      ],
      prices: { sedan: 400, medium: 500, large: 580 }, plus: true,
      note: 'Price varies with the vehicle’s condition.'
    },
    {
      id: 'premier', group: 'Packages', name: 'Premier package',
      summary: 'Full service inside and out, for a vehicle that needs a proper reset.',
      includes: [
        'Shampoo and steam clean of all carpet, upholstery, headliner, seats and mats',
        'Stain removal; plastic, leather and vinyl treated and conditioned',
        'Dash, vents, glove box, console, cup holders and every crevice',
        'Between and under seats; spare tire area removed and cleaned',
        'Hand wash including wheel wells; rims cleaned and tires dressed',
        'Tar, tree sap, bugs and road grime removed',
        'Detail wax spray and sealant; exterior trim and glass cleaned'
      ],
      prices: { sedan: 300, medium: 350, large: 380 }, plus: true,
      note: 'Messy vehicles, pet hair or extra time can cost more.'
    },
    {
      id: 'interior', group: 'Detailing', name: 'Interior detail',
      summary: 'A deep clean of every surface inside the cabin.',
      includes: [
        'Shampoo seats and carpets, steam cleaning',
        'Leather cleaning and treatment',
        'Headliner, plastics, dashboard and steering wheel',
        'Electronics, center console and door jambs'
      ],
      prices: { sedan: 195, medium: 215, large: 225 }, plus: true,
      note: 'Dog hair, neglected vehicles and special requests can cost more.'
    },
    {
      id: 'exterior', group: 'Detailing', name: 'Exterior detail',
      summary: 'Decontaminate and protect the paint, wheels and glass.',
      includes: [
        'Foam bath, clay and iron remover',
        'Tires and rims cleaned',
        'Windows cleaned',
        'Tires and plastics shined',
        'Wax or sealant'
      ],
      prices: { sedan: 160, medium: 180, large: 200 }, plus: true
    },
    {
      id: 'maintenance', group: 'Detailing', name: 'Maintenance detail',
      summary: 'Recurring upkeep for clients on our schedule. A full detail is required first.',
      includes: [
        'Hand wash, front end and mirrors de-bugged',
        'Surface spots removed, hand dried',
        'Door and trunk jambs, rims cleaned, tires dressed',
        'Windows inside and out, interior vacuumed',
        'Dash, console and door panels wiped, finished with detail spray'
      ],
      prices: { sedan: 125, medium: 145, large: 155 }, plus: false, largePlus: true,
      note: 'Available after a full detail, on a recurring schedule.'
    },
    {
      id: 'correction', group: 'Paint', name: 'Paint correction',
      summary: 'For paint that needs serious help. Every inch is decontaminated, machine polished and sealed.',
      includes: [
        'Removes water spots, swirls and deep scratches',
        'Fixes oxidation and fading clear coat',
        'Buffs out Nevada pinstriping from desert brush',
        'Professional machine polishing and sealing'
      ],
      options: [
        { id: '1', label: '1-step', price: 350 },
        { id: '2', label: '2-step', price: 400 },
        { id: '3', label: '3-step', price: 550 }
      ], plus: true,
      note: 'Final price depends on the vehicle and paint condition.'
    },
    {
      id: 'ceramic', group: 'Paint', name: 'Ceramic coating 9H',
      summary: 'A semi-permanent layer that bonds to the paint and takes the hits so your clear coat doesn’t.',
      includes: [
        'Full vehicle: paint, glass, wheels, trim and interior surfaces',
        'Precision decontamination and paint correction first',
        'Application and curing, then a final inspection',
        'Resists chemicals, UV, bird droppings, tree sap and high heat'
      ],
      options: [
        { id: '1y', label: '1 year' },
        { id: '3y', label: '3+ years' },
        { id: '6y', label: '6 years' }
      ], quote: true,
      note: 'Price depends on vehicle size and coating length. 10% off your first coating.'
    },
    {
      id: 'marine', group: 'RV & boats', name: 'RV & boat wash and wax',
      summary: 'Priced by the foot for RVs, boats and yachts.',
      includes: ['Hand wash of the full exterior', 'Your choice of spray wax, sealant, or wax with protection sealant and restore coat'],
      options: [
        { id: 'wax', label: 'Wash & spray wax', perFoot: 25 },
        { id: 'sealant', label: 'Wash & sealant', perFoot: 30 },
        { id: 'restore', label: 'Wash, wax, sealant & restore coat', perFoot: 45 }
      ]
    }
  ],
  addons: [
    { id: 'pet', label: 'Pet hair removal' },
    { id: 'stains', label: 'Heavy stains or spills' },
    { id: 'neglected', label: 'Very dirty or neglected' },
    { id: 'engine', label: 'Engine bay clean' },
    { id: 'wheels-coat', label: 'Wheel ceramic coating' }
  ]
};
