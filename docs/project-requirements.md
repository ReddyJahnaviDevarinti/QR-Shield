# Project Requirements: QRShield AI

Status: DRAFT  
Last Updated: 2026-10-04  
Owner: QRShield Project  

---

## 1. Executive Summary & Project Identity

- **Product Name**: QRShield AI
- **Professional Description**: Physical QR Tamper & Payment Destination Verification System
- **Core Mission**: Provide a deterministic and explainable verification system to establish whether a photographed or uploaded payment QR code matches a registered, trusted merchant destination, and whether physical tampering or sticker-overlay redirection has occurred.

---

## 2. Problem Statement & Significance

### 2.1 The Threat Vector
Contactless and mobile QR-based payments (notably Unified Payments Interface - UPI, and standard payment URL gateways) rely heavily on printed static QR codes displayed at merchant storefronts, checkout counters, parking meters, unattended kiosks, and donation points.

Because static QR codes are printed on paper, acrylic boards, or vinyl stands, they present an exposed physical attack surface:
1. **Physical Sticker Replacement**: An attacker prints a malicious QR code onto an adhesive sticker and pastes it over the merchant’s legitimate QR stand.
2. **Payment Destination Redirection**: The victim scans the physical display expecting payment to reach the merchant, but the payload directs funds to an attacker-controlled Virtual Payment Address (VPA) or phishing URL.
3. **Absence of Pre-Scan Validation**: Native phone cameras and consumer payment apps decode the payload and execute payment without verifying whether the printed visual stand has been altered or whether the target account matches the physical merchant's historical registration.

### 2.2 Why Existing Systems Fall Short
- **Payment Apps**: Display the payee name provided by the incoming payload or banking switch at point of transaction, but consumers routinely fail to detect subtle spelling variations (e.g., `merchant.paytm` vs `merchant-paytm` or arbitrary personal VPAs).
- **Physical Inspections**: Merchants lack an automated, auditable method to monitor whether physical QR stands deployed across multiple branches or kiosks remain untampered.

---

## 3. Core Product Goals & Non-Goals

### 3.1 Primary Goals
1. **Deterministic Destination Verification**: Programmatically extract payment destinations (e.g., UPI VPA, Merchant ID, URL hostname) from a captured QR image and verify them against an authoritative, merchant-registered profile.
2. **Visual & Tamper Indicator Detection**: Compare the physical and geometric characteristics of a scanned QR against a stored baseline reference image to identify sticker edges, surface layering, alignment anomalies, and finder pattern distortions.
3. **Transparent & Explainable Risk Scoring**: Compute a calibrated risk assessment based on deterministic rule matching and computer vision heuristics, rather than opaque classifications.
4. **Verifiable Sample Lab**: Maintain a dedicated suite of documented test specimens to validate and demonstrate system behavior under controlled conditions.
5. **Strict Truthfulness in Reporting**: Provide precise classifications based strictly on documented evidence without making unverified legal or banking claims.

### 3.2 Non-Goals & Architectural Boundaries
1. **No Core Banking or Direct Bank Database Access**: QRShield does **NOT** interface with private banking core systems, bank ledger databases, or non-public clearinghouse registries.
2. **No Bank Account Holder Identity Lookup**: QRShield will **NOT** claim to resolve or verify the legal name of a bank account holder behind an unregistered UPI ID or payment gateway string unless an authorized external regulatory API integration exists.
3. **No Payment Processing**: QRShield is not a payment gateway, payment aggregator, or financial intermediary. It does not route or hold funds.
4. **No Defamatory or Unsupported Legal Claims**: The system must never output statements such as:
   - *"This QR is definitely fake."*
   - *"This bank account is fraudulent."*
   - *"This merchant is a scammer."*
   Output must remain strictly evidentiary (e.g., *"Payment destination `xyz@bank` does not match registered destination `abc@bank` for Merchant ID #1042."*).

---

## 4. Target Users

| User Persona | Context of Use | Primary Needs |
| :--- | :--- | :--- |
| **Consumer Payers** | Scanning physical QR codes at stores, street stalls, parking kiosks, or transit hubs. | Rapid confidence check before completing payment; clear warning if destination differs from merchant name. |
| **Registered Merchants** | Store owners, retail managers, and franchise operators. | Registering legitimate payment QR stands, uploading reference baseline photos, receiving audit logs of verifications. |
| **Organization Administrators** | Campus facilities, event managers, parking operators, charities. | Managing fleet registers of static QR codes across tens or hundreds of physical payment points. |
| **Security & Risk Auditors** *(Future)* | Payment security specialists and loss prevention teams. | Aggregate reporting on physical tampering attempts, incident tracking, and test benchmark validation. |

---

## 5. Input & Output Specifications

### 5.1 Input Types
1. **Direct Camera Capture**: Real-time image capture from device video streams (mobile camera / desktop webcam) where technically supported.
2. **Static Image Upload**: Standard image files (`image/jpeg`, `image/png`, `image/webp`) up to 10 MB.
3. **Diagnostic Raw String Input**: Manual entry of raw QR payloads or UPI URIs for deterministic engine testing and debugging.
4. **Merchant Registration Artifacts**: High-resolution baseline reference photo, declared payment destination (VPA/URL), declared business name, physical location tags.

### 5.2 Output Types & Canonical Classifications

Every verification query must resolve to exactly one of the following five canonical statuses:

| Status Code | Description | Criteria |
| :--- | :--- | :--- |
| `VERIFIED` | Destination matches registered record; no physical tamper indicators detected. | Decoded payload exactly matches registered destination for merchant; visual alignment with reference image is within acceptable tolerance. |
| `DESTINATION_MISMATCH` | Decoded destination does not match registered destination. | Merchant identified, but extracted payment destination (e.g., VPA or URL) deviates from the registered record. |
| `UNVERIFIED` | QR is structurally valid, but destination is not found in the registered merchant registry. | Payload decodes properly, but no matching registered merchant identity or baseline reference exists. |
| `SUSPICIOUS` | Visual anomalies or physical tampering detected. | Detection of sticker boundaries, edge layering, severe alignment discrepancy against reference image, or anomalous redirection schemes. |
| `INSUFFICIENT_EVIDENCE` | Image quality precludes definitive verification. | Image is out of focus, severely damaged, occluded, low resolution, or cannot be decoded programmatically. |

#### Accompanying Output Payload Fields:
- `verification_id`: UUID
- `timestamp`: ISO 8601 UTC
- `status`: Canonical status enum
- `extracted_destination`: Parsed VPA / URL / Merchant ID
- `expected_destination`: Registered destination (if registered merchant identified)
- `destination_match`: Boolean or `null` (if unregistered)
- `visual_tamper_score`: Numeric index (0.0 to 1.0)
- `risk_factors`: Array of discrete rule triggers (e.g., `["STICKER_BORDER_DETECTED", "DESTINATION_HOST_UNREGISTERED"]`)
- `explanation`: Concise, neutral explanation of findings
- `evidence_summary`: Technical breakdown (finder pattern status, payload schema, visual delta)

---

## 6. Functional Capabilities & MVP Scope

### 6.1 The 16 MVP Capabilities
1. **Trusted Merchant Registration**: Merchant profile creation with unique identifier and operational details.
2. **Trusted Payment Destination Registration**: Association of exact payment endpoints (e.g., `store@icici`, `https://pay.example.com`) to merchant profiles.
3. **Reference QR Image Storage**: Secure upload and storage of pristine baseline QR photos.
4. **QR Image Upload**: Drag-and-drop / file browser client interface with client-side preview.
5. **Camera-Based QR Capture**: WebRTC-based camera stream integration with viewfinder guides where browser permissions permit.
6. **QR Decoding**: Fast, deterministic payload decoding from images.
7. **Payment Payload Extraction**: Robust parsing of standardized formats (UPI URI format `upi://pay?...`, standard web URLs, static text).
8. **Destination Comparison Engine**: Exact and canonicalized comparison between decoded targets and registered records.
9. **Physical & Reference QR Comparison**: Computer vision diffing between uploaded scan and baseline reference image.
10. **Calibrated Risk Engine**: Rule-based weighted scoring aggregating payload discrepancies, visual anomalies, and registry status.
11. **Explainable Verification Presentation**: Human-readable narrative detailing why a specific status was reached without technical obfuscation.
12. **Sample Lab (Demo Environment)**: Pre-loaded interactive testing laboratory featuring realistic specimens.
13. **Verification History**: Persistent, timestamped audit log of all verification operations conducted by authenticated users.
14. **Structured Error Handling**: Deterministic fallback and explicit messaging for corrupted, blurry, or non-QR images.
15. **Secure API Boundary**: Protected endpoints, input sanitization, rate limiting, and secret segregation.
16. **Production Deployment**: Cloud hosting on modern managed infrastructure with continuous delivery.

### 6.2 Future Scope (Post-MVP)
- Mobile native application (iOS/Android) with offline QR caching.
- Multi-location enterprise merchant portal with bulk QR provisioning.
- Automated camera frame stability and glare suppression.
- Webhook notifications for merchants when a mismatch is detected at their store location.

---

## 7. Real Sample Requirement (Sample Lab)

The system must incorporate a dedicated **Sample Lab** accessible from the application interface. The Sample Lab serves to demonstrate and test the system against controlled scenarios:

1. **Specimen Catalog Requirements**:
   - `DEMO-01`: Valid Registered QR (Clean baseline matching registered merchant).
   - `DEMO-02`: Destination Mismatch QR (Authentic-looking stand, but VPA redirects to an unauthorized address).
   - `DEMO-03`: Visually Tampered QR (Noticeable sticker overlay with physical edge lines and misaligned matrix).
   - `DEMO-04`: Unregistered QR (Legitimate clean QR pointing to an unindexed merchant).
   - `DEMO-05`: Blurred / Low-Light QR (Fails decoding threshold gracefully).
   - `DEMO-06`: Damaged / Occluded QR (Damaged finder pattern demonstrating insufficient evidence handling).
2. **Integrity Rule**: All specimens must be explicitly tagged as `TEST_DATA` in the UI and database. No claim may be made that test specimens represent active criminal cases or real victims.

---

## 8. Accuracy & Evaluation Framework

### 8.1 Benchmark Methodology
Accuracy and reliability will be measured strictly against a curated, versioned benchmark dataset of annotated QR images:
- Ground-truth annotations include: QR decodability, exact payload string, true merchant association, physical tamper presence (yes/no), and tamper bounding box.

### 8.2 Tracked Metrics
- **QR Decoding Success Rate**: $\frac{\text{Successfully Decoded Images}}{\text{Total Decodable Benchmark Images}}$
- **Destination Verification Accuracy**: Rate of correct matches against registered registry.
- **Mismatch Detection Precision & Recall**: Precision and recall in identifying altered payment endpoints.
- **Tamper Detection Precision & Recall**: Visual classifier effectiveness against sticker overlays.
- **False Positive Rate**: Percentage of legitimate, clean QRs mistakenly flagged as suspicious.

### 8.3 Anti-Fabrication Rule
No synthetic, mocked, or placeholder metrics (e.g., *"99.9% fraud detection accuracy"*) may appear anywhere in the interface, code, or documentation. Benchmark statistics will only be presented once computed from executed test suites.

---

## 9. Security, Privacy & Compliance Foundations

1. **Zero Financial Credential Exposure**: QRShield only processes public QR code payloads. It never requests, transmits, or stores bank account passwords, debit/credit card CVVs, or UPI PINs.
2. **Image Data Minimization**:
   - Consumer upload scans may be processed ephemerally in memory or stored only when explicitly opted in for audit logging.
   - Merchant reference images are stored in protected cloud storage with restricted access policies.
3. **Transport Security**: All external and internal communication must be enforced via TLS 1.3.
4. **Input Sanitization**: Decoded payloads must be strictly sanitized before storage or rendering to prevent Cross-Site Scripting (XSS), SQL injection, or command injection.

---

## 10. Acceptance Criteria for MVP Completion

- [ ] **AC-01**: A merchant can register an account, record a payment destination (e.g. UPI VPA), and upload a reference QR image.
- [ ] **AC-02**: An uploaded image containing a registered QR is decoded deterministically and returns `VERIFIED`.
- [ ] **AC-03**: An uploaded image with an altered payload targeting a different VPA returns `DESTINATION_MISMATCH` with exact string discrepancy highlighted.
- [ ] **AC-04**: An unindexed QR payload returns `UNVERIFIED` without false positive claims of fraud.
- [ ] **AC-05**: An image displaying physical sticker edges or reference divergence returns `SUSPICIOUS` with identified visual anomalies.
- [ ] **AC-06**: An unreadable or corrupted image returns `INSUFFICIENT_EVIDENCE` with guidance to re-take the photo.
- [ ] **AC-07**: Sample Lab provides interactive one-click testing of all six documented specimens.
- [ ] **AC-08**: Gemini explanation provides clear, contextual rationale for the status without inventing unsubstantiated claims.
- [ ] **AC-09**: No secrets, private credentials, or fake metrics exist in the repository or user interface.
- [ ] **AC-10**: End-to-end deployment succeeds on public URLs with active SSL certificates.
