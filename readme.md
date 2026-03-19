# AI-Powered Parametric Insurance for Gig Workers

## 🚀 Overview

India’s gig economy workers (Swiggy, Zomato, etc.) frequently face income loss due to external disruptions such as heavy rain, extreme heat, traffic congestion, or platform outages. These disruptions can reduce their working hours and result in significant financial instability.

This project proposes an **AI-powered parametric insurance platform** that provides **automated, real-time income protection** for delivery partners based on external disruption triggers.

---

## 👤 Target Persona

**Food Delivery Partners (Swiggy/Zomato)** operating in urban areas.

### Scenario:
A delivery partner in Chennai typically earns ₹500–₹800 per day. During heavy rainfall or severe traffic congestion, their ability to complete deliveries drops significantly, leading to income loss. Currently, there is no system to compensate for such losses.

---

## 💡 Solution Overview

We propose a **hyper-local, earnings-aware, time-sensitive parametric insurance system** that:

- Offers **weekly insurance plans**
- Monitors real-time disruption signals
- Automatically detects income loss
- Initiates **instant payouts without manual claims**

---

## 🔥 Key Innovations

### 📍 1. Micro-Zone Risk Modeling
- The city is divided into small **micro-zones (1–2 km grids)**  
- Each zone is assigned a risk score based on:
  - Flood history  
  - Rain frequency  
  - Traffic congestion  
- Enables **hyper-local premium calculation**

---

### 💰 2. Earnings-Aware Personalization
- Premiums and payouts are tailored based on:
  - Individual earning patterns  
  - Average hourly income  
- Ensures:
  - Fair pricing  
  - Realistic compensation  

---

### ⏱️ 3. Partial-Day Loss Detection
- Instead of full-day payouts, the system calculates:
  - **Exact hours lost due to disruption**
- Enables **precise compensation**

---

### 📊 4. Disruption Severity Scoring
- Each disruption is assigned a severity score (0–100)
- Example:
  - Light rain → Low payout  
  - Flood → Full payout  
- Ensures **proportional compensation**

---

### 🌐 5. Multi-Factor Disruption Intelligence

Unlike traditional systems that rely only on weather, our platform considers:

- 🌧️ Environmental factors (rain, heat, pollution)  
- 🚦 Traffic congestion and road blockages  
- 📱 Platform-level disruptions (app downtime, no order flow)  
- 🚫 Zone restrictions (curfews, closures)  

This provides a **realistic and accurate estimate of income loss**.

---

## 💸 Weekly Pricing Model

- Insurance plans are structured on a **weekly basis**
- Premium is dynamically calculated using AI based on:
  - Zone risk score  
  - Historical disruption data  
  - User’s income pattern  

### Example:
- Low-risk zone → ₹20/week  
- Medium-risk zone → ₹30/week  
- High-risk zone → ₹40/week  

---

## ⚙️ Parametric Triggers

Payouts are triggered automatically when predefined conditions are met:

| Trigger Type | Condition |
|-------------|----------|
| Rainfall | > 50 mm |
| Temperature | > 40°C |
| AQI | > 300 |
| Traffic Congestion | Above threshold |
| Platform Downtime | No orders assigned |
| Zone Restriction | Restricted access |

---

## 🔁 System Workflow

1. User registers and selects their working location  
2. System assigns micro-zone and calculates risk  
3. AI determines weekly premium  
4. User purchases insurance plan  
5. System continuously monitors disruption signals  
6. If trigger conditions are met:
   - Loss duration is calculated  
   - Income loss is estimated  
   - 💸 **Payout is automatically processed**  

---

## 🧠 AI/ML Integration

### 1. Risk Prediction
- Predicts likelihood of disruptions based on historical data  
- Adjusts weekly premium dynamically  

### 2. Income Estimation
- Estimates user’s hourly earnings  
- Calculates precise income loss  

### 3. Fraud Detection
- Validates:
  - GPS location vs disruption data  
  - User activity patterns  
  - Duplicate claims  
- Prevents misuse of the system  

---

## 🧱 Tech Stack

- **Frontend:** React.js + Tailwind CSS  
- **Backend:** Flask (Python)  
- **Database:** SQLite (Phase 1), scalable to MySQL  
- **AI/ML:** Python (pandas, scikit-learn)  
- **APIs:** Weather API (OpenWeatherMap), Mock APIs for traffic & platform data  
- **Payments:** Razorpay (Test Mode for payout simulation)  

---

## 🌐 Platform Choice

We chose a **Web Application** because:
- Faster development and deployment  
- Easier demonstration and testing  
- Scalable to mobile apps in future  

---

## 📊 Dashboard (Planned)

### For Workers:
- Active coverage  
- Earnings protected  
- Recent payouts  

### For Admin:
- Risk analytics  
- Claim frequency  
- Disruption trends  

---

## 🔮 Future Scope

- Mobile app version  
- Advanced ML models for prediction  
- Integration with real delivery platform APIs  
- Real-time traffic API integration  
- Expansion to grocery and e-commerce delivery segments  

---

## 📌 Key Differentiator

Unlike traditional parametric insurance systems that rely on fixed payouts and city-level triggers, our solution introduces **hyper-local risk modeling, earnings-aware personalization, and time-based loss detection**, ensuring fair and precise income protection for gig workers.

---


