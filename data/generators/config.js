// Data generation configuration
export const CONFIG = {
  // Record counts
  complaints: 5000,
  escalation_traces: 3000,
  scam_reports: 500,
  outages: 200,

  // Time ranges
  date_range_days: 90,

  // Ghost ward configuration (these wards will have higher ghost scores)
  ghost_wards: ['W015', 'W042', 'W083', 'W127', 'W156', 'W178'],
  ghost_ward_stagnation_rate: 0.65,
  normal_ward_stagnation_rate: 0.15,

  // Status distribution for normal wards
  normal_status_distribution: {
    'open': 0.15,
    'in_progress': 0.10,
    'pending': 0.08,
    'resolved': 0.45,
    'closed': 0.17,
    'rejected': 0.03,
    'transferred': 0.02
  },

  // Status distribution for ghost wards (more unresolved)
  ghost_status_distribution: {
    'open': 0.35,
    'in_progress': 0.12,
    'pending': 0.18,
    'resolved': 0.15,
    'closed': 0.10,
    'rejected': 0.05,
    'transferred': 0.05
  },

  // Priority distribution
  priority_distribution: {
    'low': 0.20,
    'medium': 0.45,
    'high': 0.25,
    'critical': 0.10
  },

  // Citizen types
  citizen_types: ['individual', 'business', 'ngo', 'government', 'anonymous'],
  citizen_type_weights: [0.70, 0.15, 0.05, 0.02, 0.08],

  // Scam correlation with outages
  scam_outage_correlation_rate: 0.30,

  // Output paths
  output_dir: '../generated'
};

export const COMPLAINT_TITLES = {
  BBMP: {
    road_damage: [
      'Pothole causing accidents on {road}',
      'Severe road damage near {landmark}',
      'Road surface completely broken on {road}',
      'Multiple potholes on {road} need immediate attention',
      'Road cave-in near {landmark}'
    ],
    garbage: [
      'Garbage not collected for {days} days in {area}',
      'Overflowing garbage bin near {landmark}',
      'Waste dumping on vacant plot in {area}',
      'No garbage pickup this week in {area}',
      'Garbage truck not coming to {road}'
    ],
    drainage: [
      'Sewage overflow on {road}',
      'Blocked drainage causing waterlogging in {area}',
      'Manhole cover missing near {landmark}',
      'Drain water flooding streets in {area}',
      'Sewage smell from open drain on {road}'
    ],
    streetlight: [
      'Street light not working on {road}',
      'Multiple street lights out near {landmark}',
      'Dark stretch on {road} - safety concern',
      'Flickering street light near {landmark}',
      'Street light pole damaged on {road}'
    ],
    tree_fall: [
      'Dangerous tree leaning on {road}',
      'Fallen tree blocking {road}',
      'Tree branches about to fall near {landmark}',
      'Dead tree posing risk on {road}',
      'Tree roots damaging pavement on {road}'
    ]
  },
  BESCOM: {
    power_outage: [
      'No power supply for {hours} hours in {area}',
      'Frequent power cuts in {area}',
      'Complete blackout in {area} since morning',
      'Power not restored after outage in {area}',
      'Unscheduled power cut affecting {area}'
    ],
    voltage_fluctuation: [
      'High voltage fluctuation damaging appliances in {area}',
      'Low voltage problem in {area}',
      'Voltage drops frequently in {area}',
      'Unstable power supply affecting business in {area}'
    ],
    transformer_failure: [
      'Transformer blast in {area}',
      'Transformer overloaded in {area}',
      'Transformer making noise near {landmark}',
      'Transformer oil leak in {area}'
    ],
    cable_damage: [
      'Exposed electric cables on {road}',
      'Damaged power lines near {landmark}',
      'Hanging cables posing risk on {road}',
      'Cable sparking near {landmark}'
    ],
    billing_dispute: [
      'Incorrect bill amount of ₹{amount}',
      'Meter reading not matching consumption',
      'Bill shows {units} units but actual is less',
      'Double billing for same month'
    ]
  },
  BWSSB: {
    no_water: [
      'No water supply for {days} days in {area}',
      'Water not coming since {days} days',
      'Complete water supply disruption in {area}',
      'Dry taps for {days} days in {area}'
    ],
    low_pressure: [
      'Very low water pressure in {area}',
      'Water barely trickling in {area}',
      'Pressure too low to reach upper floors in {area}'
    ],
    pipeline_leak: [
      'Major pipeline leak on {road}',
      'Water main burst near {landmark}',
      'Pipeline leaking for {days} days on {road}',
      'Underground pipe leak causing road damage on {road}'
    ],
    sewage_overflow: [
      'Sewage overflow on {road}',
      'Sewage entering homes in {area}',
      'Underground drainage blocked in {area}',
      'Sewage backup affecting multiple houses in {area}'
    ],
    water_quality: [
      'Contaminated water supply in {area}',
      'Brown/muddy water coming from taps in {area}',
      'Water has bad smell in {area}',
      'Worms found in water supply in {area}'
    ]
  },
  RERA: {
    project_delay: [
      'Builder delayed possession by {months} months',
      '{builder} project {project} completion delayed',
      'No progress on {project} for {months} months',
      'Promised completion date passed {months} months ago'
    ],
    builder_fraud: [
      '{builder} sold same flat to multiple buyers',
      'Builder {builder} misrepresented project {project}',
      '{builder} collected money but no construction',
      'Fake documents provided by {builder}'
    ],
    quality_defect: [
      'Major structural defects in {project}',
      'Water leakage in new flat in {project}',
      'Poor construction quality in {project}',
      'Cracks appearing in walls of {project}'
    ]
  }
};

export const LANDMARKS = [
  'Bus Stop', 'Metro Station', 'School', 'Hospital', 'Temple', 'Mosque', 'Church',
  'Park', 'Market', 'Mall', 'Bank', 'ATM', 'Petrol Pump', 'Police Station',
  'College', 'Library', 'Post Office', 'Railway Station', 'Flyover', 'Junction',
  'Signal', 'Circle', 'Lake', 'Ground', 'Stadium', 'Theatre', 'Restaurant'
];

export const ROAD_SUFFIXES = [
  'Main Road', 'Cross', '1st Main', '2nd Main', '3rd Cross', '4th Cross',
  'Ring Road', 'Service Road', 'Highway', 'Extension', 'Layout Main Road'
];

export const AREA_PREFIXES = [
  'Near', 'Behind', 'Opposite to', 'Adjacent to', 'In front of', 'Next to'
];

export const BUILDERS = [
  'Prestige Group', 'Brigade Group', 'Sobha Limited', 'Puravankara', 'Embassy Group',
  'Godrej Properties', 'Mantri Developers', 'Salarpuria Sattva', 'Total Environment',
  'Shriram Properties', 'Provident Housing', 'Sumadhura', 'Mahindra Lifespaces'
];

export const PROJECT_NAMES = [
  'Lake View', 'Palm Grove', 'Green Valley', 'Sky Gardens', 'Royal Heights',
  'Paradise', 'Elite Towers', 'Sunshine Residency', 'Golden Acres', 'Silver Oak'
];
