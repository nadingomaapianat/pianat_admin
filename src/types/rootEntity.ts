/**
 * Archetype capability matrix — trimmed copy of the customer app's
 * src/types/rootEntity.ts (only the bits the admin gate needs). Keep in
 * lock-step with the backend src/shared/archetype-capabilities.ts.
 */
export type RootEntityType =
  | 'client'
  | 'consulting_firm'
  | 'audit_firm'
  | 'regulator'
  | 'platform_operator';

export const DEFAULT_ROOT_ENTITY_TYPE: RootEntityType = 'client';

export function resolveRootEntityType(value: string | null | undefined): RootEntityType {
  if (
    value === 'client' ||
    value === 'consulting_firm' ||
    value === 'audit_firm' ||
    value === 'regulator' ||
    value === 'platform_operator'
  ) {
    return value;
  }
  return DEFAULT_ROOT_ENTITY_TYPE;
}

export interface ArchetypeCapabilities {
  hasPractitioners: boolean;
  hasPlaybookIp: boolean;
  ownsEvidenceVault: boolean;
  hasAuditWorkspace: boolean;
  canFederateOutbound: boolean;
  canFederateInbound: boolean;
  canManagePartners: boolean;
  canManageAllTenants: boolean;
  canImpersonateAnyTenant: boolean;
  canAccessCrossTenantAudit: boolean;
  canManageMemberships: boolean;
}

const BASE: ArchetypeCapabilities = {
  hasPractitioners: false,
  hasPlaybookIp: false,
  ownsEvidenceVault: false,
  hasAuditWorkspace: false,
  canFederateOutbound: false,
  canFederateInbound: false,
  canManagePartners: false,
  canManageAllTenants: false,
  canImpersonateAnyTenant: false,
  canAccessCrossTenantAudit: false,
  canManageMemberships: false,
};

export const ROOT_ENTITY_CAPABILITIES: Record<RootEntityType, ArchetypeCapabilities> = {
  client: { ...BASE, ownsEvidenceVault: true, canFederateInbound: true, canManagePartners: true, canManageMemberships: true },
  consulting_firm: { ...BASE, hasPractitioners: true, hasPlaybookIp: true, canFederateOutbound: true, canManageMemberships: true },
  audit_firm: { ...BASE, hasPractitioners: true, hasAuditWorkspace: true, canFederateOutbound: true, canManageMemberships: true },
  regulator: { ...BASE, canFederateInbound: true },
  platform_operator: {
    ...BASE,
    canManagePartners: true,
    canManageAllTenants: true,
    canImpersonateAnyTenant: true,
    canAccessCrossTenantAudit: true,
    canManageMemberships: true,
  },
};

export function capabilitiesFor(value: string | null | undefined): ArchetypeCapabilities {
  return ROOT_ENTITY_CAPABILITIES[resolveRootEntityType(value)];
}
