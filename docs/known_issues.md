# Known Issues

This document tracks known issues, gaps, and outstanding items that require attention before production deployment.

## Compliance

### COPPA and GDPR Compliance

- **Status:** Not addressed
- **Priority:** High
- **Description:** Need to evaluate and implement compliance requirements for:
  - Children's Online Privacy Protection Act (COPPA)
  - General Data Protection Regulation (GDPR)
- **Considerations:**
  - Relay is designed to minimize data collection, which aligns with privacy regulations
  - Anonymous mailbox feature collects no PII by design
  - Group coordinator accounts require email addresses (potential GDPR scope)
  - Need to determine if COPPA applies given the target user base

## Analytics and Metrics

### Success Metrics Tracking

- **Status:** Not implemented
- **Priority:** Medium
- **Description:** Need to define and implement success metrics for the Relay platform and pilot program
- **Potential Metrics:**
  - Number of verified groups
  - Funding request volume and approval rates
  - Time-to-funding averages
  - Anonymous help request engagement (aggregate only)
- **Constraints:**
  - Must not track individual-level data
  - Must not log anonymous user activity
  - Aggregate reporting only
