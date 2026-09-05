import { Route, Stop, ChargingCenter, VehiclePublic } from '../types';

export interface RouteMetadata {
  frequency: string;
  operatingHours: string;
  fareRange: string;
  lengthKm: number;
  category: 'rapid' | 'express' | 'heritage' | 'airport' | 'industrial';
  categoryLabel: string;
  fleetType: string;
  peakHeadwayMins: number;
}

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  'JPR-L1': {
    frequency: 'Every 5-7 mins',
    operatingHours: '05:30 AM - 11:30 PM',
    fareRange: '₹10 - ₹25',
    lengthKm: 12.8,
    category: 'rapid',
    categoryLabel: 'Metro Feeder & Rapid',
    fleetType: '100% Zero-Emission Metro & 12m E-Buses',
    peakHeadwayMins: 6,
  },
  'JPR-L2': {
    frequency: 'Every 8-10 mins',
    operatingHours: '06:00 AM - 10:30 PM',
    fareRange: '₹15 - ₹35',
    lengthKm: 14.6,
    category: 'heritage',
    categoryLabel: 'Heritage & Tourism Express',
    fleetType: 'Air-Conditioned Low-Floor E-Buses',
    peakHeadwayMins: 8,
  },
  'JPR-L3': {
    frequency: 'Every 10-12 mins',
    operatingHours: '24/7 Service',
    fareRange: '₹20 - ₹50',
    lengthKm: 18.2,
    category: 'airport',
    categoryLabel: 'Airport Express Link',
    fleetType: 'High-Comfort Luggage E-Coaches',
    peakHeadwayMins: 10,
  },
  'JPR-L4': {
    frequency: 'Every 7-9 mins',
    operatingHours: '06:00 AM - 11:00 PM',
    fareRange: '₹10 - ₹30',
    lengthKm: 21.4,
    category: 'express',
    categoryLabel: 'Tech & Knowledge Spine',
    fleetType: 'Fast-Charge Municipal E-Buses',
    peakHeadwayMins: 7,
  },
  'JPR-L5': {
    frequency: 'Every 12-15 mins',
    operatingHours: '06:30 AM - 10:00 PM',
    fareRange: '₹10 - ₹20',
    lengthKm: 11.5,
    category: 'industrial',
    categoryLabel: 'Clean Industrial Shuttle',
    fleetType: 'High-Capacity Workforce E-Buses',
    peakHeadwayMins: 12,
  },
  'BKN-L1': {
    frequency: 'Every 8-10 mins',
    operatingHours: '06:00 AM - 10:30 PM',
    fareRange: '₹10 - ₹25',
    lengthKm: 15.4,
    category: 'rapid',
    categoryLabel: 'City Core Spine',
    fleetType: 'Olectra & Tata Ultra 9m E-Buses',
    peakHeadwayMins: 8,
  },
  'BKN-L2': {
    frequency: 'Every 10-12 mins',
    operatingHours: '06:30 AM - 10:00 PM',
    fareRange: '₹10 - ₹20',
    lengthKm: 10.2,
    category: 'express',
    categoryLabel: 'Station & Education Link',
    fleetType: 'JBM Ecolife E-Buses',
    peakHeadwayMins: 10,
  },
  'BKN-L3': {
    frequency: 'Every 15-20 mins',
    operatingHours: '05:30 AM - 11:00 PM',
    fareRange: '₹15 - ₹40',
    lengthKm: 28.5,
    category: 'heritage',
    categoryLabel: 'Pilgrim & Medical Corridor',
    fleetType: 'Switch EiV 12 Long-Range E-Buses',
    peakHeadwayMins: 15,
  },
  'BKN-L4': {
    frequency: 'Every 12-15 mins',
    operatingHours: '06:30 AM - 09:30 PM',
    fareRange: '₹10 - ₹20',
    lengthKm: 9.8,
    category: 'express',
    categoryLabel: 'Heritage & Tech Connector',
    fleetType: 'Olectra CX2 Clean Buses',
    peakHeadwayMins: 12,
  },
};

export const DEFAULT_ROUTE_META: RouteMetadata = {
  frequency: 'Every 10-12 mins',
  operatingHours: '06:00 AM - 10:30 PM',
  fareRange: '₹10 - ₹30',
  lengthKm: 12.0,
  category: 'rapid',
  categoryLabel: 'Public Clean Transit',
  fleetType: '100% Zero-Emission Electric Bus',
  peakHeadwayMins: 10,
};

// Jaipur Fallback Transit Network Data
export const FALLBACK_JAIPUR_STOPS: Stop[] = [
  { id: 'jpr-msv', name: 'Mansarovar Metro Terminal', code: 'JPR-MSV', latitude: 26.8795, longitude: 75.7562, city: 'Jaipur', state: 'Rajasthan', address: 'Mansarovar Metro Station, Bhrigu Path', is_active: true },
  { id: 'jpr-atm', name: 'New Aatish Market', code: 'JPR-ATM', latitude: 26.8835, longitude: 75.7645, city: 'Jaipur', state: 'Rajasthan', address: 'Gopalpura Bypass, New Aatish Market', is_active: true },
  { id: 'jpr-vkv', name: 'Vivek Vihar', code: 'JPR-VKV', latitude: 26.8885, longitude: 75.7715, city: 'Jaipur', state: 'Rajasthan', address: 'Vivek Vihar Metro Circle', is_active: true },
  { id: 'jpr-shy', name: 'Shyam Nagar', code: 'JPR-SHY', latitude: 26.8945, longitude: 75.7760, city: 'Jaipur', state: 'Rajasthan', address: 'Ajmer Road, Shyam Nagar', is_active: true },
  { id: 'jpr-rmn', name: 'Ram Nagar', code: 'JPR-RMN', latitude: 26.8995, longitude: 75.7810, city: 'Jaipur', state: 'Rajasthan', address: 'Hawa Sadak, Ram Nagar', is_active: true },
  { id: 'jpr-cvl', name: 'Civil Lines', code: 'JPR-CVL', latitude: 26.9065, longitude: 75.7870, city: 'Jaipur', state: 'Rajasthan', address: 'Jacob Road, Civil Lines', is_active: true },
  { id: 'jpr-rly', name: 'Jaipur Junction Railway Station', code: 'JPR-RLY', latitude: 26.9195, longitude: 75.7885, city: 'Jaipur', state: 'Rajasthan', address: 'Station Road Platform 1, Hasanpura', is_active: true },
  { id: 'jpr-scb', name: 'Sindhi Camp Central Bus Stand', code: 'JPR-SCB', latitude: 26.9235, longitude: 75.7985, city: 'Jaipur', state: 'Rajasthan', address: 'ISBT Sindhi Camp, Station Road', is_active: true },
  { id: 'jpr-cpg', name: 'Chandpole Gate & Metro', code: 'JPR-CPG', latitude: 26.9255, longitude: 75.8115, city: 'Jaipur', state: 'Rajasthan', address: 'Chandpole Bazar Entry, Old Pink City', is_active: true },
  { id: 'jpr-chc', name: 'Chhoti Chaupar', code: 'JPR-CHC', latitude: 26.9258, longitude: 75.8200, city: 'Jaipur', state: 'Rajasthan', address: 'Chhoti Chaupar Heritage Circle', is_active: true },
  { id: 'jpr-bdc', name: 'Badi Chaupar (Hawa Mahal)', code: 'JPR-BDC', latitude: 26.9240, longitude: 75.8270, city: 'Jaipur', state: 'Rajasthan', address: 'Opp. Hawa Mahal, Badi Chaupar', is_active: true },

  { id: 'jpr-ksk', name: 'Khasa Kothi Circle', code: 'JPR-KSK', latitude: 26.9190, longitude: 75.7940, city: 'Jaipur', state: 'Rajasthan', address: 'MI Road & Khasa Kothi Circle', is_active: true },
  { id: 'jpr-ajg', name: 'Ajmeri Gate', code: 'JPR-AJG', latitude: 26.9180, longitude: 75.8180, city: 'Jaipur', state: 'Rajasthan', address: 'Ajmeri Gate Chauraha, Kishanpole', is_active: true },
  { id: 'jpr-sng', name: 'Sanganeri Gate', code: 'JPR-SNG', latitude: 26.9160, longitude: 75.8245, city: 'Jaipur', state: 'Rajasthan', address: 'Sanganeri Gate Market Circle', is_active: true },
  { id: 'jpr-jsg', name: 'Jorawar Singh Gate', code: 'JPR-JSG', latitude: 26.9380, longitude: 75.8360, city: 'Jaipur', state: 'Rajasthan', address: 'Amer Road North Gate', is_active: true },
  { id: 'jpr-jmh', name: 'Jal Mahal Promenade', code: 'JPR-JMH', latitude: 26.9535, longitude: 75.8465, city: 'Jaipur', state: 'Rajasthan', address: 'Man Sagar Lake Viewpoint, Amer Road', is_active: true },
  { id: 'jpr-amr', name: 'Amer Fort & Palace Stand', code: 'JPR-AMR', latitude: 26.9855, longitude: 75.8510, city: 'Jaipur', state: 'Rajasthan', address: 'Amer Palace Entrance, Devisinghpura', is_active: true },

  { id: 'jpr-air', name: 'Jaipur International Airport (Terminal 2)', code: 'JPR-AIR', latitude: 26.8285, longitude: 75.8055, city: 'Jaipur', state: 'Rajasthan', address: 'Arrivals Gate 1, Airport Terminal 2', is_active: true },
  { id: 'jpr-jwc', name: 'Jawahar Circle Garden', code: 'JPR-JWC', latitude: 26.8435, longitude: 75.8020, city: 'Jaipur', state: 'Rajasthan', address: 'JLND Marg, Jawahar Circle', is_active: true },
  { id: 'jpr-dgp', name: 'Durgapura Railway Station', code: 'JPR-DGP', latitude: 26.8570, longitude: 75.7950, city: 'Jaipur', state: 'Rajasthan', address: 'Tonk Road, Durgapura', is_active: true },
  { id: 'jpr-gpl', name: 'Gopalpura Bypass Circle', code: 'JPR-GPL', latitude: 26.8720, longitude: 75.7860, city: 'Jaipur', state: 'Rajasthan', address: 'Gopalpura Flyover Circle', is_active: true },
  { id: 'jpr-sdl', name: 'Sodala Elevated Junction', code: 'JPR-SDL', latitude: 26.9020, longitude: 75.7760, city: 'Jaipur', state: 'Rajasthan', address: 'Ajmer Road, Sodala Chauraha', is_active: true },
  { id: 'jpr-qrd', name: 'Queens Road Corner', code: 'JPR-QRD', latitude: 26.9080, longitude: 75.7530, city: 'Jaipur', state: 'Rajasthan', address: 'Queens Road & Vaishali Entry', is_active: true },
  { id: 'jpr-amp', name: 'Amrapali Circle (Vaishali Nagar)', code: 'JPR-AMP', latitude: 26.9135, longitude: 75.7420, city: 'Jaipur', state: 'Rajasthan', address: 'Amrapali Plaza, Vaishali Nagar', is_active: true },

  { id: 'jpr-jgt', name: 'Jagatpura Railway Station', code: 'JPR-JGT', latitude: 26.8340, longitude: 75.8450, city: 'Jaipur', state: 'Rajasthan', address: 'Jagatpura Flyover Junction', is_active: true },
  { id: 'jpr-mlv', name: 'Malviya Nagar (WTP & MNIT)', code: 'JPR-MLV', latitude: 26.8530, longitude: 75.8130, city: 'Jaipur', state: 'Rajasthan', address: 'JLND Marg, Opp. World Trade Park', is_active: true },
  { id: 'jpr-apx', name: 'Apex Circle', code: 'JPR-APX', latitude: 26.8620, longitude: 75.8080, city: 'Jaipur', state: 'Rajasthan', address: 'Malviya Nagar Institutional Area', is_active: true },
  { id: 'jpr-gnd', name: 'Gandhi Nagar Railway Station', code: 'JPR-GND', latitude: 26.8780, longitude: 75.8010, city: 'Jaipur', state: 'Rajasthan', address: 'Tonk Road, Gandhi Nagar', is_active: true },
  { id: 'jpr-rmb', name: 'Rambagh Circle', code: 'JPR-RMB', latitude: 26.8970, longitude: 75.8060, city: 'Jaipur', state: 'Rajasthan', address: 'SMS Stadium, Rambagh Circle', is_active: true },
  { id: 'jpr-sms', name: 'SMS Hospital Gate', code: 'JPR-SMS', latitude: 26.9080, longitude: 75.8140, city: 'Jaipur', state: 'Rajasthan', address: 'JLN Marg, SMS Medical College', is_active: true },
  { id: 'jpr-pbt', name: 'Panch Batti / MI Road', code: 'JPR-PBT', latitude: 26.9170, longitude: 75.8160, city: 'Jaipur', state: 'Rajasthan', address: 'MI Road Commercial Zone', is_active: true },
  { id: 'jpr-sec', name: 'Government Secretariat', code: 'JPR-SEC', latitude: 26.9090, longitude: 75.7950, city: 'Jaipur', state: 'Rajasthan', address: 'Bhagwan Das Road, Secretariat', is_active: true },
  { id: 'jpr-col', name: 'Collectorate Circle', code: 'JPR-COL', latitude: 26.9290, longitude: 75.7910, city: 'Jaipur', state: 'Rajasthan', address: 'Bani Park, Collectorate', is_active: true },
  { id: 'jpr-vdn', name: 'Vidhyadhar Nagar Stadium', code: 'JPR-VDN', latitude: 26.9650, longitude: 75.7820, city: 'Jaipur', state: 'Rajasthan', address: 'Sector 3 Stadium, Vidhyadhar Nagar', is_active: true },

  { id: 'jpr-stp', name: 'Sitapura Industrial RIICO Gate', code: 'JPR-STP', latitude: 26.7720, longitude: 75.8380, city: 'Jaipur', state: 'Rajasthan', address: 'Tonk Road, Sitapura Industrial Zone', is_active: true },
  { id: 'jpr-mgh', name: 'Mahatma Gandhi Hospital', code: 'JPR-MGH', latitude: 26.7820, longitude: 75.8420, city: 'Jaipur', state: 'Rajasthan', address: 'RIICO Institutional Area, Sitapura', is_active: true },
  { id: 'jpr-prt', name: 'Pratap Nagar Sector 11', code: 'JPR-PRT', latitude: 26.8020, longitude: 75.8260, city: 'Jaipur', state: 'Rajasthan', address: 'Haldighati Marg, Pratap Nagar', is_active: true },
  { id: 'jpr-sng-tm', name: 'Sanganer Bus Terminus', code: 'JPR-SNG-TM', latitude: 26.8180, longitude: 75.7710, city: 'Jaipur', state: 'Rajasthan', address: 'Old Sanganer Town Bus Stand', is_active: true },
];

export const FALLBACK_JAIPUR_ROUTES: Route[] = [
  {
    id: 'jpr-l1',
    name: 'Line 1 (Pink Heritage Metro Corridor): Mansarovar ⇄ Badi Chaupar',
    code: 'JPR-L1',
    city: 'Jaipur',
    state: 'Rajasthan',
    description: 'High-frequency East-West rapid electric transit connecting residential Mansarovar to the historic Walled City & Hawa Mahal.',
    color: '#ec4899',
    is_active: true,
    geometry: {
      type: 'LineString',
      coordinates: [
        [75.7562, 26.8795], [75.7600, 26.8815], [75.7645, 26.8835], [75.7680, 26.8860],
        [75.7715, 26.8885], [75.7740, 26.8915], [75.7760, 26.8945], [75.7785, 26.8970],
        [75.7810, 26.8995], [75.7840, 26.9030], [75.7870, 26.9065], [75.7878, 26.9130],
        [75.7885, 26.9195], [75.7935, 26.9215], [75.7985, 26.9235], [75.8050, 26.9245],
        [75.8115, 26.9255], [75.8160, 26.9256], [75.8200, 26.9258], [75.8235, 26.9250],
        [75.8270, 26.9240]
      ]
    },
    stops: FALLBACK_JAIPUR_STOPS.slice(0, 11)
  },
  {
    id: 'jpr-l2',
    name: 'Line 2 (Green Amber Express): Sindhi Camp ⇄ Amer Fort',
    code: 'JPR-L2',
    city: 'Jaipur',
    state: 'Rajasthan',
    description: 'Scenic tourism & commuter express linking Jaipur central bus interchange directly with the UNESCO World Heritage Amer Fort.',
    color: '#10b981',
    is_active: true,
    geometry: {
      type: 'LineString',
      coordinates: [
        [75.7985, 26.9235], [75.7960, 26.9210], [75.7940, 26.9190], [75.8060, 26.9185],
        [75.8180, 26.9180], [75.8210, 26.9170], [75.8245, 26.9160], [75.8260, 26.9200],
        [75.8270, 26.9240], [75.8315, 26.9310], [75.8360, 26.9380], [75.8410, 26.9455],
        [75.8465, 26.9535], [75.8485, 26.9695], [75.8510, 26.9855]
      ]
    },
    stops: [
      FALLBACK_JAIPUR_STOPS[7], FALLBACK_JAIPUR_STOPS[11], FALLBACK_JAIPUR_STOPS[12],
      FALLBACK_JAIPUR_STOPS[13], FALLBACK_JAIPUR_STOPS[10], FALLBACK_JAIPUR_STOPS[14],
      FALLBACK_JAIPUR_STOPS[15], FALLBACK_JAIPUR_STOPS[16]
    ]
  },
  {
    id: 'jpr-l3',
    name: 'Line 3 (Blue Airport Express): Airport Terminal 2 ⇄ Vaishali Nagar',
    code: 'JPR-L3',
    city: 'Jaipur',
    state: 'Rajasthan',
    description: 'Fast arterial airport corridor traversing JLN Marg, Durgapura, Sodala Elevated Road, and West Jaipur commercial districts.',
    color: '#0284c7',
    is_active: true,
    geometry: {
      type: 'LineString',
      coordinates: [
        [75.8055, 26.8285], [75.8040, 26.8360], [75.8020, 26.8435], [75.7985, 26.8500],
        [75.7950, 26.8570], [75.7905, 26.8645], [75.7860, 26.8720], [75.7810, 26.8870],
        [75.7760, 26.9020], [75.7645, 26.9050], [75.7530, 26.9080], [75.7475, 26.9110],
        [75.7420, 26.9135]
      ]
    },
    stops: [
      FALLBACK_JAIPUR_STOPS[17], FALLBACK_JAIPUR_STOPS[18], FALLBACK_JAIPUR_STOPS[19],
      FALLBACK_JAIPUR_STOPS[20], FALLBACK_JAIPUR_STOPS[21], FALLBACK_JAIPUR_STOPS[22],
      FALLBACK_JAIPUR_STOPS[23]
    ]
  },
  {
    id: 'jpr-l4',
    name: 'Line 4 (Orange Knowledge & Tech Line): Jagatpura ⇄ Vidhyadhar Nagar',
    code: 'JPR-L4',
    city: 'Jaipur',
    state: 'Rajasthan',
    description: 'Cross-city transit spine serving educational hubs (MNIT), shopping districts (WTP), healthcare (SMS Hospital), and north suburbs.',
    color: '#f97316',
    is_active: true,
    geometry: {
      type: 'LineString',
      coordinates: [
        [75.8450, 26.8340], [75.8290, 26.8435], [75.8130, 26.8530], [75.8105, 26.8575],
        [75.8080, 26.8620], [75.8045, 26.8700], [75.8010, 26.8780], [75.8035, 26.8875],
        [75.8060, 26.8970], [75.8100, 26.9025], [75.8140, 26.9080], [75.8150, 26.9125],
        [75.8160, 26.9170], [75.8055, 26.9130], [75.7950, 26.9090], [75.7930, 26.9190],
        [75.7910, 26.9290], [75.7865, 26.9470], [75.7820, 26.9650]
      ]
    },
    stops: [
      FALLBACK_JAIPUR_STOPS[24], FALLBACK_JAIPUR_STOPS[25], FALLBACK_JAIPUR_STOPS[26],
      FALLBACK_JAIPUR_STOPS[27], FALLBACK_JAIPUR_STOPS[28], FALLBACK_JAIPUR_STOPS[29],
      FALLBACK_JAIPUR_STOPS[30], FALLBACK_JAIPUR_STOPS[31], FALLBACK_JAIPUR_STOPS[32],
      FALLBACK_JAIPUR_STOPS[33]
    ]
  },
  {
    id: 'jpr-l5',
    name: 'Line 5 (Purple Clean Industrial Shuttle): Sitapura RIICO ⇄ Sanganer Terminus',
    code: 'JPR-L5',
    city: 'Jaipur',
    state: 'Rajasthan',
    description: 'Dedicated workforce and student zero-emission shuttle connecting Sitapura Industrial Zone, hospitals, and Sanganer town.',
    color: '#8b5cf6',
    is_active: true,
    geometry: {
      type: 'LineString',
      coordinates: [
        [75.8380, 26.7720], [75.8400, 26.7770], [75.8420, 26.7820], [75.8340, 26.7920],
        [75.8260, 26.8020], [75.7985, 26.8100], [75.7710, 26.8180]
      ]
    },
    stops: [
      FALLBACK_JAIPUR_STOPS[34], FALLBACK_JAIPUR_STOPS[35], FALLBACK_JAIPUR_STOPS[36],
      FALLBACK_JAIPUR_STOPS[37]
    ]
  }
];

export const FALLBACK_JAIPUR_CHARGING_CENTERS: ChargingCenter[] = [
  {
    id: 'jpr-cc-1',
    name: 'Tata Power EZ Charge - Sindhi Camp ISBT Hub',
    latitude: 26.9238,
    longitude: 75.7988,
    address: 'Opp. Bus Stand Terminal 2, Sindhi Camp, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    status: 'operational',
    power_kw: 120.0,
    contact_phone: '+91 1800 209 5161',
    operating_hours: '24/7 Open',
    description: 'High-capacity ultra-fast DC charging hub for public transit buses, commercial cabs, and passenger EVs.',
    connectors: { CCS2: 4, Type2: 2, 'GB/T': 2, fast_dc: true },
    amenities: { restroom: true, waiting_lounge: true, wifi: true, pricing_inr_kwh: 18.0 },
    public_visible: true,
  },
  {
    id: 'jpr-cc-2',
    name: 'Jadhao EV Fast Charging - Airport Plaza T2',
    latitude: 26.8290,
    longitude: 75.8060,
    address: 'Terminal 2 Commercial Car Parking, Sanganer, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302029',
    status: 'operational',
    power_kw: 150.0,
    contact_phone: '+91 141 279 2828',
    operating_hours: '24/7 Open',
    description: 'Supercharger facility at Jaipur Airport with dual-gun 150kW CCS2 dispensers.',
    connectors: { CCS2: 4, fast_dc: true },
    amenities: { restroom: true, cafe: true, security_24x7: true, pricing_inr_kwh: 19.5 },
    public_visible: true,
  },
  {
    id: 'jpr-cc-3',
    name: 'ChargeZone Hub - Jaipur Junction Station',
    latitude: 26.9198,
    longitude: 75.7890,
    address: 'Station Parking Lot, Hasanpura Road, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302006',
    status: 'operational',
    power_kw: 60.0,
    contact_phone: '+91 8000 333 444',
    operating_hours: '24/7 Open',
    description: 'Railway station multi-modal transit charging center.',
    connectors: { CCS2: 2, Type2: 2 },
    amenities: { restroom: true, food_court: true, pricing_inr_kwh: 17.5 },
    public_visible: true,
  },
  {
    id: 'jpr-cc-4',
    name: 'Statiq Smart Hub - Mansarovar Metro',
    latitude: 26.8798,
    longitude: 75.7565,
    address: 'Mansarovar Metro Parking Complex, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302020',
    status: 'operational',
    power_kw: 60.0,
    contact_phone: '+91 9999 123 456',
    operating_hours: '05:00 AM - 11:30 PM',
    description: 'Commuter park-and-charge EV station at western terminal of Pink Line Metro.',
    connectors: { CCS2: 2, Type2: 2 },
    amenities: { restroom: true, pricing_inr_kwh: 16.5 },
    public_visible: true,
  },
  {
    id: 'jpr-cc-5',
    name: 'Volttic DC Station - World Trade Park (Malviya Nagar)',
    latitude: 26.8535,
    longitude: 75.8135,
    address: 'WTP South Block Basement EV Zone, JLN Marg, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302017',
    status: 'operational',
    power_kw: 50.0,
    contact_phone: '+91 141 400 5000',
    operating_hours: '10:00 AM - 11:00 PM',
    description: 'Retail destination fast charger for shoppers and JLN corridor commuters.',
    connectors: { CCS2: 2, Type2: 2 },
    amenities: { restroom: true, cafe: true, wifi: true, pricing_inr_kwh: 18.5 },
    public_visible: true,
  }
];

export const FALLBACK_JAIPUR_VEHICLES: VehiclePublic[] = [
  {
    id: 'v-jpr-101',
    vehicle_code: 'JPR-BUS-101',
    vehicle_type: 'electric_bus',
    department_name: 'Jaipur Smart City Transit',
    latitude: 26.9065,
    longitude: 75.7870,
    speed_kph: 38,
    heading_deg: 65,
    direction: 'NE',
    soc_pct: 88,
    charging: false,
    status: 'online',
    route_code: 'JPR-L1',
    route_name: 'Line 1 (Pink Heritage Metro Corridor)',
    next_stop_name: 'Civil Lines',
    eta_next_stop_mins: 2,
    origin_stop: 'Mansarovar Metro Terminal',
    destination_stop: 'Badi Chaupar (Hawa Mahal)',
    schedule_status: 'On Time',
  },
  {
    id: 'v-jpr-102',
    vehicle_code: 'JPR-BUS-102',
    vehicle_type: 'electric_bus',
    department_name: 'Jaipur Smart City Transit',
    latitude: 26.9255,
    longitude: 75.8115,
    speed_kph: 29,
    heading_deg: 90,
    direction: 'E',
    soc_pct: 72,
    charging: false,
    status: 'online',
    route_code: 'JPR-L1',
    route_name: 'Line 1 (Pink Heritage Metro Corridor)',
    next_stop_name: 'Chandpole Gate & Metro',
    eta_next_stop_mins: 1,
    origin_stop: 'Mansarovar Metro Terminal',
    destination_stop: 'Badi Chaupar (Hawa Mahal)',
    schedule_status: 'On Time',
  },
  {
    id: 'v-jpr-201',
    vehicle_code: 'JPR-BUS-201',
    vehicle_type: 'electric_bus',
    department_name: 'Jaipur Smart City Transit',
    latitude: 26.9535,
    longitude: 75.8465,
    speed_kph: 44,
    heading_deg: 15,
    direction: 'N',
    soc_pct: 94,
    charging: false,
    status: 'online',
    route_code: 'JPR-L2',
    route_name: 'Line 2 (Green Amber Express)',
    next_stop_name: 'Jal Mahal Promenade',
    eta_next_stop_mins: 3,
    origin_stop: 'Sindhi Camp Central Bus Stand',
    destination_stop: 'Amer Fort & Palace Stand',
    schedule_status: 'On Time',
  },
  {
    id: 'v-jpr-301',
    vehicle_code: 'JPR-BUS-301',
    vehicle_type: 'electric_bus',
    department_name: 'Jaipur Smart City Transit',
    latitude: 26.8570,
    longitude: 75.7950,
    speed_kph: 52,
    heading_deg: 340,
    direction: 'NW',
    soc_pct: 81,
    charging: false,
    status: 'online',
    route_code: 'JPR-L3',
    route_name: 'Line 3 (Blue Airport Express)',
    next_stop_name: 'Durgapura Railway Station',
    eta_next_stop_mins: 4,
    origin_stop: 'Jaipur International Airport (Terminal 2)',
    destination_stop: 'Amrapali Circle (Vaishali Nagar)',
    schedule_status: 'On Time',
  },
  {
    id: 'v-jpr-401',
    vehicle_code: 'JPR-BUS-401',
    vehicle_type: 'electric_bus',
    department_name: 'Jaipur Smart City Transit',
    latitude: 26.8780,
    longitude: 75.8010,
    speed_kph: 40,
    heading_deg: 355,
    direction: 'N',
    soc_pct: 77,
    charging: false,
    status: 'online',
    route_code: 'JPR-L4',
    route_name: 'Line 4 (Orange Knowledge & Tech Line)',
    next_stop_name: 'Gandhi Nagar Railway Station',
    eta_next_stop_mins: 2,
    origin_stop: 'Jagatpura Railway Station',
    destination_stop: 'Vidhyadhar Nagar Stadium',
    schedule_status: 'On Time',
  },
  {
    id: 'v-jpr-501',
    vehicle_code: 'JPR-BUS-501',
    vehicle_type: 'electric_bus',
    department_name: 'Jaipur Smart City Transit',
    latitude: 26.7820,
    longitude: 75.8420,
    speed_kph: 46,
    heading_deg: 170,
    direction: 'S',
    soc_pct: 84,
    charging: false,
    status: 'online',
    route_code: 'JPR-L5',
    route_name: 'Line 5 (Purple Clean Industrial Shuttle)',
    next_stop_name: 'Mahatma Gandhi Hospital',
    eta_next_stop_mins: 2,
    origin_stop: 'Sitapura Industrial RIICO Gate',
    destination_stop: 'Sanganer Bus Terminus',
    schedule_status: 'On Time',
  },
  {
    id: 'v-jpr-amb-01',
    vehicle_code: 'JPR-AMB-108',
    vehicle_type: 'ambulance_ev',
    department_name: 'Department of Medical & Health (108 EV)',
    latitude: 26.8920,
    longitude: 75.8150,
    speed_kph: 48,
    heading_deg: 210,
    direction: 'SW',
    soc_pct: 91,
    charging: false,
    status: 'online',
    route_code: 'SMS-EMERGENCY',
    route_name: 'SMS Hospital Rapid Medical Corridor',
    next_stop_name: 'SMS Medical College & Hospital',
    eta_next_stop_mins: 3,
    origin_stop: 'Jaipur Central Medical Depot',
    destination_stop: 'SMS Trauma Centre',
    schedule_status: 'Active Priority',
  },
  {
    id: 'v-jpr-util-01',
    vehicle_code: 'JPR-UTIL-04',
    vehicle_type: 'utility_ev',
    department_name: 'Jaipur Vidyut Vitran Nigam (JVVNL Green Utility)',
    latitude: 26.9150,
    longitude: 75.7720,
    speed_kph: 31,
    heading_deg: 45,
    direction: 'NE',
    soc_pct: 79,
    charging: false,
    status: 'online',
    route_code: 'GRID-MAINT-4',
    route_name: 'Western Zone Substation Patrol',
    next_stop_name: 'Vaishali Grid Substation',
    eta_next_stop_mins: 5,
    origin_stop: 'JVVNL Circle Office',
    destination_stop: 'Khatipura Substation',
    schedule_status: 'On Patrol',
  },
  {
    id: 'v-jpr-util-02',
    vehicle_code: 'JPR-UTIL-07',
    vehicle_type: 'utility_ev',
    department_name: 'Jaipur Municipal Corporation (Cleanliness EV)',
    latitude: 26.9290,
    longitude: 75.8240,
    speed_kph: 24,
    heading_deg: 120,
    direction: 'SE',
    soc_pct: 85,
    charging: false,
    status: 'online',
    route_code: 'HERITAGE-SWEEP',
    route_name: 'Walled City Zero-Emission Sanitation',
    next_stop_name: 'Tripolia Bazar',
    eta_next_stop_mins: 2,
    origin_stop: 'Ramniwas Garden Depot',
    destination_stop: 'Johari Bazar Chowk',
    schedule_status: 'In Service',
  }
];

// Helper to get route metadata
export function getRouteMeta(code?: string | null): RouteMetadata {
  if (!code) return DEFAULT_ROUTE_META;
  return ROUTE_METADATA[code] || DEFAULT_ROUTE_META;
}

// Compute geographic bounding box across routes
export function calculateRoutesBoundingBox(routes: Route[]): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  let hasPoints = false;

  for (const r of routes) {
    if (r.geometry && (r.geometry as any).coordinates) {
      const coords = (r.geometry as any).coordinates;
      for (const pt of coords) {
        if (Array.isArray(pt) && pt.length >= 2) {
          const [lng, lat] = pt;
          if (typeof lng === 'number' && typeof lat === 'number') {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            hasPoints = true;
          }
        }
      }
    } else if (r.stops && r.stops.length > 0) {
      for (const s of r.stops) {
        if (s.longitude && s.latitude) {
          minLng = Math.min(minLng, s.longitude);
          maxLng = Math.max(maxLng, s.longitude);
          minLat = Math.min(minLat, s.latitude);
          maxLat = Math.max(maxLat, s.latitude);
          hasPoints = true;
        }
      }
    }
  }

  if (!hasPoints) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}
