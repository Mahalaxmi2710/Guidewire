# AI-Powered Parametric Insurance for Gig Workers

## Overview

India’s gig economy workers (e.g., Swiggy, Zomato) are highly vulnerable to external disruptions such as extreme weather, pollution, traffic congestion, and platform outages. These events directly reduce working hours and lead to significant income loss, with no existing safety net.

This project proposes an **AI-powered parametric insurance platform** that provides **automated, real-time income protection**, while also incorporating **predictive intelligence to minimize loss before it occurs**.

The system transforms traditional insurance from a **reactive compensation mechanism** into a **proactive income stabilization system**.

---

## Target Persona

**Urban food delivery partners (Swiggy/Zomato)**

### Scenario

A delivery partner in Chennai earns approximately ₹500–₹800 per day. During heavy rainfall or high congestion periods, their delivery capacity drops significantly, resulting in reduced earnings. Currently, no mechanism exists to compensate for this loss of income.

---

## Solution Overview

The proposed system is a **hyper-local, earnings-aware, parametric insurance platform** that:

- Provides **weekly insurance plans aligned with gig worker income cycles**
- Continuously monitors **real-time disruption signals**
- Uses predictive models to **anticipate disruptions**
- Suggests **adaptive work strategies to reduce potential income loss**
- Automatically detects loss and triggers **instant payouts without manual claims**

---

## Key Innovations

### 1. Micro-Zone Risk Modeling

- Urban areas are divided into **micro-zones (1–2 km grids)**
- Each zone is assigned a **dynamic risk score** based on:
  - Historical flooding data
  - Rainfall patterns
  - Traffic congestion levels
- Enables **granular, location-specific premium calculation**

---

### 2. Earnings-Aware Personalization

- Premiums and payouts are personalized using:
  - Individual earning history
  - Average hourly income
- Ensures:
  - Fair premium pricing
  - Accurate loss compensation

---

### 3. Partial-Day Loss Detection

- Loss is calculated based on **actual hours impacted**, not full-day assumptions
- Improves precision and reduces overcompensation

---

### 4. Disruption Severity Scoring

- Each disruption is assigned a **severity score (0–100)**
- Used to scale payouts proportionally:
  - Low severity → partial compensation
  - High severity → full compensation

---

### 5. Multi-Factor Disruption Intelligence

The system integrates multiple real-world signals:

- Environmental data (rainfall, temperature, AQI)
- Traffic congestion levels
- Platform activity (order availability)
- Zone accessibility (curfews, restrictions)

This enables **accurate identification of income-impacting conditions**, rather than relying on a single data source.

---

### 6. Pre-Disruption Earnings Optimization

The system proactively reduces loss by:

- Predicting upcoming disruptions using historical and real-time data
- Recommending:
  - Zone switching
  - Time adjustments
  - High-demand areas

This reduces claim frequency and improves worker earnings.

---

### 7. Adaptive Risk Redistribution

Instead of halting operations in high-risk zones, the system introduces **choice-based risk participation**:

- **Safe Mode**: Low-risk zones, stable earnings  
- **Flex Mode**: Moderate risk with moderate incentives  
- **High-Risk Mode**: Higher earnings potential with increased insurance coverage  

This ensures:
- Continued delivery operations  
- Worker autonomy in risk-taking  
- System sustainability  

---

## Weekly Pricing Model

- Premiums are calculated on a **weekly basis**
- Inputs:
  - Zone risk score
  - Historical disruption frequency
  - User earnings profile

### Example

- Low-risk zone: ₹20/week  
- Medium-risk zone: ₹30/week  
- High-risk zone: ₹40/week  

---

## Parametric Triggers

Payouts are automatically triggered when predefined thresholds are met:

| Trigger Type         | Condition            |
|---------------------|---------------------|
| Rainfall            | > 50 mm             |
| Temperature         | > 40°C              |
| AQI                 | > 300               |
| Traffic Congestion  | Above threshold     |
| Platform Downtime   | No orders assigned  |
| Zone Restriction    | Restricted access   |

---

## System Workflow

1. User registers and selects working location  
2. System assigns micro-zone and computes risk profile  
3. AI calculates weekly premium  
4. User activates insurance plan  
5. System continuously monitors disruption signals  
6. Predictive module suggests pre-disruption adjustments  
7. When trigger conditions are met:
   - Loss duration is calculated  
   - Income loss is estimated  
   - Payout is processed automatically  

---

## AI/ML Integration

### 1. Risk Prediction
- Predicts disruption likelihood using historical and real-time data
- Dynamically adjusts premiums

### 2. Income Estimation
- Estimates hourly earning potential
- Computes precise loss during disruptions

### 3. Fraud Detection

Given the limitations of GPS-based validation and the emergence of coordinated spoofing attacks, the system employs a **multi-layered fraud detection strategy**:

#### Multi-Signal Verification
- Network-based location triangulation  
- Device motion analysis (accelerometer and gyroscope)  
- Order activity correlation  
- Environmental consistency checks  

#### Behavioral Modeling
- Learns individual work and movement patterns  
- Detects anomalies in behavior  

#### Fraud Ring Detection
- Graph-based analysis to identify coordinated claim patterns  
- Detection of cluster-based anomalies  

#### UX-Aware Enforcement
- Suspicious claims are:
  - Partially processed  
  - Flagged for passive verification  
  - Fully settled after validation  

This ensures fraud prevention without penalizing genuine users.

---

## Cloud Architecture (Firebase)

The system uses a **serverless, event-driven architecture**:

- **Firestore**: Stores policies, user data, risk scores, and claims  
- **Cloud Functions**: Executes disruption monitoring and trigger evaluation  
- **Firebase Auth**: Handles authentication and onboarding  
- **Event-driven triggers**: Enable real-time claim processing  

This architecture ensures **scalability, low latency, and real-time responsiveness**.

---

## Blockchain Integration

A lightweight blockchain layer can be integrated for:

- Smart contract-based policy execution  
- Tamper-proof payout verification  
- Immutable claim records  

Blockchain is used strictly as a **trust and audit layer**, while core logic remains off-chain for performance.

---

## Stakeholder Value

- **Workers**: Income stability and improved earning opportunities  
- **Platforms**: Improved delivery continuity and reduced worker churn  
- **Insurers**: Controlled payouts and reduced fraud exposure  
- **Customers**: Continued service availability

---

## Platform Choice

A web-based platform is selected for:

- Rapid development and deployment  
- Ease of testing and demonstration  
- Future scalability to mobile applications  

---

## Dashboard

### Worker Dashboard
- Active coverage status  
- Earnings protection summary  
- Real-time disruption alerts  
- Suggested work optimizations  

### Admin Dashboard
- Risk analytics  
- Claim frequency and trends  
- Fraud detection insights  
- Predictive disruption modeling  

---

## Tech Stack

- Frontend: React.js, Tailwind CSS  
- Backend: Firebase
- AI/ML: Python (pandas, scikit-learn)  
- APIs: Weather APIs, mock traffic and platform APIs  
- Payments: Razorpay (test mode)  
- Blockchain: Ethereum (Sepolia testnet)  
