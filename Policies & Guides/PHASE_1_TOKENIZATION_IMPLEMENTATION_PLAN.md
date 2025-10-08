# 🔐 BASSLINE PHASE 1: PII TOKENIZATION IMPLEMENTATION PLAN

**Document Version:** 1.0  
**Created:** September 21, 2025  
**Target Timeline:** 4-6 weeks  
**Complexity:** Medium  

---

## 📋 EXECUTIVE SUMMARY

This document outlines Phase 1 implementation of a Skyflow-style data privacy vault for Bassline Fitness. The goal is to tokenize all Personally Identifiable Information (PII) while maintaining GDPR/CCPA compliance and enabling automated DSAR (Data Subject Access Request) generation.

**Phase 1 Focus:** Spotify user data tokenization with basic audit trails using existing infrastructure.

### 🏗️ HYBRID APPROACH: COMPLIANCE-READY ARCHITECTURE

**Current Implementation:** Same database instance (cost-effective for early stage)
**Future Migration:** Easy port to segregated environment when budget allows

**Key Benefits:**
- ✅ **Zero additional monthly costs** during development
- ✅ **Compliance by design** - architecture and processes ready
- ✅ **Marketing advantage** - legitimate privacy-first positioning  
- ✅ **Easy migration path** - code designed for future separation

**Security Note:** *PII breach protection requires separate vault instance. Current implementation provides tokenization benefits (compliance, audit trails, DSAR automation) but not full breach isolation until migration to dedicated vault infrastructure.*

---

## 🎯 OBJECTIVES

### Primary Goals
- ✅ **Tokenize Spotify User Data** - Replace email/display names with non-sensitive tokens
- ✅ **Separate PII Storage** - Move actual PII to encrypted vault database
- ✅ **Audit Trail Foundation** - Track when PII is stored and retrieved
- ✅ **Maintain Functionality** - Zero disruption to existing user experience
- ✅ **GDPR Compliance** - Enable future DSAR and ROPA automation

### Success Criteria
- All Spotify user emails/names stored as tokens only
- Audit log captures 100% of PII interactions
- Existing authentication flows work unchanged
- Performance impact <100ms for token operations

---

## 🏗️ TECHNICAL ARCHITECTURE

### Current Bassline Architecture (Relevant Components)
```
User Browser ↔ Frontend (React) ↔ Netlify Functions ↔ Spotify API
                    ↓
                Supabase (PostgreSQL with RLS)
```

### Phase 1 Enhanced Architecture (Hybrid Approach)
```
User Browser ↔ Frontend (React) ↔ Netlify Functions ↔ Spotify API
                    ↓
            Supabase (Existing Instance - FREE)
            ├── App Tables (tokens only)
            ├── PII Vault Tables (encrypted)
            └── Audit Trail Tables (compliance)
```

### Future Production Architecture (When Budget Allows)
```
User Browser ↔ Frontend (React) ↔ Netlify Functions ↔ Spotify API
                    ↓                    ↓
            Supabase (Tokens Only)   Separate PII Vault
                    ↓                    ↓
                 Audit Trail ←――――――――――――→
```

---

## 🔧 IMPLEMENTATION PLAN

### Week 1-2: Database Schema & Infrastructure

#### 1.1 Create PII Vault Tables (Same Supabase Instance)
```sql
-- Add to existing Bassline Supabase instance (FREE)
CREATE TABLE pii_vault (
    vault_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encrypted_data JSONB NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'spotify_user', 'workout_data', etc.
    encryption_key_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- For data retention
    CONSTRAINT valid_data_type CHECK (data_type IN ('spotify_user', 'workout_data', 'user_profile'))
);

-- Indexes for performance
CREATE INDEX idx_pii_vault_data_type ON pii_vault(data_type);
CREATE INDEX idx_pii_vault_expires_at ON pii_vault(expires_at);
```

#### 1.2 Create Token Mapping Table
```sql
-- Add to existing Bassline Supabase
CREATE TABLE pii_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL, -- References pii_vault.vault_id
    token_type VARCHAR(50) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0
);

-- RLS Policies
ALTER TABLE pii_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own tokens" ON pii_tokens
    FOR ALL USING (auth.uid()::text = token_id::text);
```

#### 1.3 Create Audit Trail Table
```sql
CREATE TABLE pii_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
    user_id UUID,
    purpose VARCHAR(200) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_context JSONB -- Additional context like session_id, etc.
);

-- Indexes for compliance queries
CREATE INDEX idx_audit_log_vault_id ON pii_audit_log(vault_id);
CREATE INDEX idx_audit_log_user_id ON pii_audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON pii_audit_log(timestamp);
```

### Week 2-3: Core Tokenization Service

#### 2.1 Create Encryption Utility
```typescript
// src/lib/encryption-service.ts
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_VERSION = 1;

  static async encryptPII(data: any, dataType: string): Promise<{
    encryptedData: string;
    vault_id: string;
    keyVersion: number;
  }> {
    // Implementation with crypto-js or Node.js crypto
    // Key derivation from environment variables
  }

  static async decryptPII(encryptedData: string, keyVersion: number): Promise<any> {
    // Decrypt using appropriate key version
  }

  static generateToken(): string {
    // Generate URL-safe token that doesn't leak information
    return `bsln_${crypto.randomUUID().replace(/-/g, '')}`;
  }
}
```

#### 2.2 Create Tokenization Service
```typescript
// src/lib/tokenization-service.ts
export class TokenizationService {
  static async tokenizeSpotifyUser(userData: {
    email: string;
    display_name: string;
    spotify_id: string;
  }): Promise<{
    userToken: string;
    emailToken: string;
    nameToken: string;
  }> {
    // 1. Encrypt PII and store in vault
    // 2. Create tokens in pii_tokens table
    // 3. Log to audit trail
    // 4. Return tokens for application use
  }

  static async detokenizeSpotifyUser(userToken: string): Promise<{
    email: string;
    display_name: string;
    spotify_id: string;
  }> {
    // 1. Look up vault_id from token
    // 2. Retrieve and decrypt PII
    // 3. Log access to audit trail
    // 4. Return decrypted data
  }
}
```

#### 2.3 Create Netlify Function for Token Operations
```typescript
// netlify/functions/pii-vault.ts
export const handler: Handler = async (event, context) => {
  const { action, data } = JSON.parse(event.body || '{}');

  switch (action) {
    case 'tokenize':
      return await handleTokenize(data);
    case 'detokenize':
      return await handleDetokenize(data);
    case 'audit':
      return await handleAuditQuery(data);
    default:
      return { statusCode: 400, body: 'Invalid action' };
  }
};
```

### Week 3-4: Integration with Existing Authentication

#### 3.1 Update Spotify Authentication Flow
```typescript
// Modify netlify/functions/spotify-proxy.ts
// In the token exchange section:

// OLD:
const userProfile = await makeSpotifyApiCall('/me', 'GET', tokens.access_token);

// NEW:
const userProfile = await makeSpotifyApiCall('/me', 'GET', tokens.access_token);

// Tokenize PII before storing
const tokenizedUser = await TokenizationService.tokenizeSpotifyUser({
  email: userProfile.email,
  display_name: userProfile.display_name,
  spotify_id: userProfile.id
});

// Store only tokens in session/database
const sessionData = {
  user_token: tokenizedUser.userToken,
  email_token: tokenizedUser.emailToken,
  name_token: tokenizedUser.nameToken,
  spotify_id: userProfile.id // This can remain as it's not PII
};
```

#### 3.2 Update Frontend to Handle Tokens
```typescript
// src/lib/spotify-secure.ts
// Modify methods that display user information

export class SecureSpotifyService {
  async getCurrentUser(): Promise<SpotifyUser> {
    // Get tokens from session
    const tokens = await this.getStoredTokens();
    
    // Detokenize when user data is needed for display
    const userData = await TokenizationService.detokenizeSpotifyUser(tokens.user_token);
    
    return {
      email: userData.email,
      display_name: userData.display_name,
      id: tokens.spotify_id
    };
  }
}
```

### Week 4-5: Audit Trail Implementation

#### 4.1 Create Audit Service
```typescript
// src/lib/audit-service.ts
export class AuditService {
  static async logPIIAccess(params: {
    vault_id: string;
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    purpose: string;
    user_id?: string;
    context?: any;
  }): Promise<void> {
    // Log to pii_audit_log table
    // Include IP, user agent, timestamp
  }

  static async generateDSARReport(user_id: string): Promise<{
    data_collected: any[];
    processing_purposes: string[];
    retention_periods: any[];
    access_history: any[];
  }> {
    // Query audit logs and vault for user's data
    // Generate GDPR-compliant report
  }

  static async generateROPAData(): Promise<{
    processing_activities: any[];
    legal_basis: string[];
    data_categories: string[];
    retention_schedules: any[];
  }> {
    // Generate Record of Processing Activities
  }
}
```

#### 4.2 Add Compliance Endpoints
```typescript
// netlify/functions/compliance.ts
export const handler: Handler = async (event, context) => {
  const { action, user_id } = JSON.parse(event.body || '{}');

  switch (action) {
    case 'dsar':
      // Generate Data Subject Access Request report
      const dsarReport = await AuditService.generateDSARReport(user_id);
      return { statusCode: 200, body: JSON.stringify(dsarReport) };
      
    case 'ropa':
      // Generate Record of Processing Activities
      const ropaData = await AuditService.generateROPAData();
      return { statusCode: 200, body: JSON.stringify(ropaData) };
      
    case 'delete':
      // Handle right to erasure
      await TokenizationService.deleteUserData(user_id);
      return { statusCode: 200, body: 'Data deleted' };
  }
};
```

### Week 5-6: Testing & Deployment

#### 5.1 Testing Strategy
```typescript
// src/lib/__tests__/tokenization.test.ts
describe('Tokenization Service', () => {
  test('should tokenize and detokenize user data correctly', async () => {
    // Test round-trip tokenization
  });

  test('should log all PII access to audit trail', async () => {
    // Verify audit logging
  });

  test('should handle encryption key rotation', async () => {
    // Test key versioning
  });
});
```

#### 5.2 Migration Strategy
```sql
-- Migration script to tokenize existing user data
-- database-updates/migrate-to-tokenization.sql

DO $$
DECLARE
    user_record RECORD;
    tokenized_data JSONB;
BEGIN
    -- For each existing user with PII
    FOR user_record IN 
        SELECT * FROM profiles WHERE email IS NOT NULL
    LOOP
        -- Tokenize existing PII
        -- Update records with tokens
        -- Preserve data integrity
    END LOOP;
END $$;
```

---

## 🔒 SECURITY CONSIDERATIONS

### Encryption Standards
- **Algorithm:** AES-256-GCM for authenticated encryption
- **Key Management:** Environment-based with rotation capability
- **Key Storage:** Separate from encrypted data
- **Key Versioning:** Support for key rotation without data migration

### Access Controls
- **Principle of Least Privilege:** Functions only access required vault data
- **API Rate Limiting:** Prevent vault enumeration attacks
- **Audit All Access:** Log every PII operation
- **Network Isolation:** Vault database separate from application database

### Data Protection
- **Encryption at Rest:** All PII encrypted before storage
- **Encryption in Transit:** TLS 1.3 for all vault communications
- **Token Format:** Non-sequential, non-predictable tokens
- **Data Minimization:** Only tokenize actual PII

---

## 📊 PERFORMANCE CONSIDERATIONS

### Expected Impact
- **Token Generation:** <50ms per operation
- **Token Resolution:** <100ms per operation
- **Database Overhead:** ~20% increase in storage
- **Network Overhead:** Additional vault queries

### Optimization Strategies
- **Caching:** Redis/memory cache for frequently accessed tokens
- **Batch Operations:** Bulk tokenization for data imports
- **Connection Pooling:** Efficient database connections
- **Async Processing:** Non-blocking audit logging

---

## 📈 METRICS & MONITORING

### Key Performance Indicators
- **Tokenization Success Rate:** >99.9%
- **Average Response Time:** <100ms
- **Audit Log Coverage:** 100% of PII operations
- **Data Breach Risk:** Eliminated for tokenized data

### Monitoring Setup
```typescript
// Example monitoring points
const metrics = {
  tokenization_requests: counter(),
  tokenization_latency: histogram(),
  vault_errors: counter(),
  audit_log_writes: counter()
};
```

---

## 🚀 DEPLOYMENT PLAN

### Environment Setup
1. **Development:** Local testing with existing Supabase
2. **Staging:** Vault tables in existing instance for integration testing
3. **Production Phase 1:** Same instance deployment (cost-effective)
4. **Production Phase 2:** Migration to separate vault (when budget allows)

### Rollout Strategy
1. **Week 1-4:** Development and testing
2. **Week 5:** Staging deployment
3. **Week 6:** Production deployment with gradual rollout

### Rollback Plan
- Maintain existing PII in parallel during transition
- Gradual migration with fallback capability
- Emergency detokenization procedures

---

## 💰 COST ANALYSIS

### Infrastructure Costs
- **Phase 1 (Hybrid):** $0/month - uses existing Supabase free tier
- **Future Separation:** ~$35/month when migrating to dedicated vault
- **Development Time:** 160-240 hours

### Benefits
- **GDPR Compliance:** Avoid potential €20M fines
- **Marketing Advantage:** Legitimate privacy-first positioning
- **Audit Trail:** Complete PII access logging for compliance
- **DSAR Automation:** Automated data subject access requests
- **Future-Proof:** Easy migration to full breach protection
- **Competitive Edge:** Enterprise-ready compliance architecture

### Migration Benefits (Future)
- **Breach Protection:** True PII isolation when budget allows
- **Enterprise Sales:** Full compliance for B2B customers
- **Audit Confidence:** Segregated data architecture

---

## 📋 NEXT STEPS

### Immediate Actions (Week 1)
1. ✅ **Add vault tables to existing Supabase** (no additional cost)
2. ✅ **Set up development environment** with encryption testing
3. ✅ **Design database schemas** for vault and audit tables
4. ✅ **Create basic encryption utilities** and test

### Migration Planning (Future)
- **Vault Separation:** Move PII tables to dedicated instance (~$35/month)
- **Enhanced Security:** True breach protection with segregated infrastructure
- **Enterprise Features:** Advanced tokenization and analytics
- **Multi-tenant Support:** Separate vaults per enterprise customer

### Compliance Benefits Available Now
- ✅ **GDPR Audit Trail:** Complete PII access logging
- ✅ **DSAR Automation:** Generate data subject access reports
- ✅ **ROPA Compliance:** Record of processing activities
- ✅ **Privacy by Design:** Tokenized architecture ready
- ✅ **Marketing Position:** Legitimate privacy-first claims

---

## 🤝 STAKEHOLDER APPROVAL

### Required Sign-offs
- [ ] **Technical Lead:** Architecture and implementation approach
- [ ] **Legal/Compliance:** GDPR compliance verification
- [ ] **Product Owner:** User experience impact assessment
- [ ] **Security:** Encryption and access control review

### Risk Assessment
- **Low Risk:** Basic tokenization implementation
- **Medium Risk:** Performance impact on user experience
- **High Risk:** Data migration and potential data loss

---

**Document Owner:** Technical Team  
**Next Review:** Post-Phase 1 completion  
**Related Documents:** 
- Bassline Data Privacy Policy.docx
- SPOTIFY_SECURITY_POLICY.md
- primer.md (Session Rules)

---

*This implementation plan follows Bassline's secure-by-design principles and maintains compatibility with existing authentication architecture while adding enterprise-grade privacy protection.*