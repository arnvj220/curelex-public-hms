// hms-react/src/utils/planConfig.js

export const PLAN_CONFIGS = {
  lite: {
    label: 'Lite Plan',
    maxDoctors: 3,
    maxReceptionists: 2,
    maxPharmacists: 0,
    maxStaff: 5,
    features: {
      patients: true,
      billing: false,
      pharmacy: false,
      inventory: false,
      lab: false,
      ipd: false,
      staff: false,
      telemedicine: false,
      prescriptions: false,
      tokens: true,
      emergency: false,
      tasks: false,
    },
    visibleSections: {
      overview: true,
      doctors: true,
      receptionists: true,
      allPatients: true,
      followUps: false,
      settings: true,
      pharmacists: false,
      revenue: false,
      inventory: false,
    },
  },
  plus: {
    label: 'Plus Plan',
    maxDoctors: -1,
    maxReceptionists: -1,
    maxPharmacists: 2,
    maxStaff: -1,
    features: {
      patients: true,
      billing: true,
      pharmacy: true,
      inventory: false,
      lab: false,
      ipd: false,
      staff: true,
      telemedicine: false,
      prescriptions: true,
      tokens: true,
      emergency: false,
      tasks: false,
    },
    visibleSections: {
      overview: true,
      doctors: true,
      receptionists: true,
      allPatients: true,
      followUps: true,
      settings: true,
      pharmacists: true,
      revenue: true,
      inventory: false,
    },
  },
  pro: {
    label: 'Pro Plan',
    maxDoctors: -1,
    maxReceptionists: -1,
    maxPharmacists: -1,
    maxStaff: -1,
    features: {
      patients: true,
      billing: true,
      pharmacy: true,
      inventory: true,
      lab: true,
      ipd: true,
      staff: true,
      telemedicine: true,
      prescriptions: true,
      tokens: true,
      emergency: true,
      tasks: true,
    },
    visibleSections: {
      overview: true,
      doctors: true,
      receptionists: true,
      allPatients: true,
      followUps: true,
      settings: true,
      pharmacists: true,
      revenue: true,
      inventory: true,
    },
  },
};
// ── Helper Functions ──

export function getPlanConfig(planKey) {
  return PLAN_CONFIGS[planKey] || PLAN_CONFIGS.lite;
}

export function canAddStaff(planKey, roleType, currentCount) {
  const config = getPlanConfig(planKey);
  
  let maxCount = 0;
  switch (roleType) {
    case 'doctors':
      maxCount = config.maxDoctors;
      break;
    case 'receptionists':
      maxCount = config.maxReceptionists;
      break;
    case 'pharmacists':
      maxCount = config.maxPharmacists;
      break;
    case 'staff':
      maxCount = config.maxStaff;
      break;
    default:
      return { allowed: true, limit: -1, upgradeNeeded: null };
  }

  // -1 means unlimited
  if (maxCount === -1) {
    return { allowed: true, limit: -1, upgradeNeeded: null };
  }

  const allowed = currentCount < maxCount;
  const upgradeNeeded = allowed ? null : getUpgradePath(planKey);
  
  return { 
    allowed, 
    limit: maxCount, 
    upgradeNeeded,
    message: allowed ? '' : `You've reached the limit of ${maxCount} ${roleType}. Upgrade to add more.`
  };
}

function getUpgradePath(currentPlan) {
  const planOrder = ['lite', 'plus', 'pro'];
  const currentIndex = planOrder.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex >= planOrder.length - 1) {
    return null;
  }
  return planOrder[currentIndex + 1];
}

export function isFeatureVisible(planKey, featureKey) {
  const config = getPlanConfig(planKey);
  return config.features?.[featureKey] ?? false;
}

export function isSectionVisible(planKey, sectionKey) {
  const config = getPlanConfig(planKey);
  return config.visibleSections?.[sectionKey] ?? false;
}

export function isPlanActive(planKey) {
  return planKey && planKey !== 'none' && planKey !== null;
}

export function getPlanLimits(planKey) {
  const config = getPlanConfig(planKey);
  return {
    maxDoctors: config.maxDoctors,
    maxReceptionists: config.maxReceptionists,
    maxPharmacists: config.maxPharmacists,
    maxStaff: config.maxStaff,
  };
}

export function getPlanFeatures(planKey) {
  const config = getPlanConfig(planKey);
  return config.features || {};
}

export function getPlanVisibleSections(planKey) {
  const config = getPlanConfig(planKey);
  return config.visibleSections || {};
}

export function getPlanLabel(planKey) {
  const config = getPlanConfig(planKey);
  return config.label || 'Lite Plan';
}

// ── Plan upgrade path ──
export const PLAN_UPGRADE_PATH = {
  lite: 'plus',
  plus: 'pro',
  pro: null,
};

export function getNextPlan(currentPlan) {
  return PLAN_UPGRADE_PATH[currentPlan] || null;
}