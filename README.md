# 🏥 Aarogya Darpan (आरोग्य दर्पण)

> **Next-Generation Digital Hospital Management & Unified Electronic Health Record (EHR) System**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI_GPT--4o_Mini-412991?style=for-the-badge&logo=openai)](https://openai.com/)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://aarogya-darpan.vercel.app/)

**Live Application:** [aarogya-darpan.vercel.app](https://aarogya-darpan.vercel.app/)

---

## 📖 Overview

**Aarogya Darpan** is a cloud-native, end-to-end digital hospital ecosystem built to bridge the gap between patients, healthcare providers, laboratories, and pharmacies. Powered by **Next.js 14**, **Supabase (PostgreSQL)**, and **OpenAI**, Aarogya Darpan eliminates paper records and disjointed portals through a high-performance clinical workflow platform.

---

## ✨ Key Features & Role-Based Portals

### 🧑‍💼 1. Patient Portal
- **Unified Health ID (UHID)**: Auto-generated lifetime identification for medical records.
- **Appointment Scheduling**: Browse hospitals and certified doctors, check consultation fees, and schedule OPD visits.
- **Digital Prescriptions**: View medical prescriptions and unique 6-digit dispensary token numbers.
- **Lab Investigation Reports**: Access pathological reports with normal/abnormal reference range indicators.
- **Family Health Accounts**: Manage dependents (children, elderly parents, spouse) within a single login.
- **Billing & Receipts**: Track invoices, outstanding dues, discounts, and payment receipts.
- **Patient Access Control**: Approve or deny doctor requests to access complete medical history.

### 🩺 2. Doctor Portal
- **Clinical Dashboard**: Real-time overview of daily scheduled appointments, pending consults, and bed status.
- **EMR & Patient Access**: Request and review historical diagnoses, vitals, previous prescriptions, and lab tests upon patient consent.
- **Prescription Writer**: Formulate structured digital prescriptions with medicine dosage, frequency, duration, and instructions.
- **Lab Orders**: Order lab tests directly from the consultation interface with urgent/routine triage tags.

### 🏥 3. Hospital Administrator Portal
- **Resource Management**: Configure bed capacity, ICU, and general wards with real-time occupancy indicators.
- **Doctors & Staff Onboarding**: Hire and manage doctors, receptionists, lab technicians, and pharmacists.
- **Hospital Configuration**: Customize departments, consultation fees, emergency capacity, and license credentials.
- **Analytics & Revenue**: Track daily patient footfall, department revenue, and weekly visit trends.

### 📋 4. Reception & Emergency
- **Rapid Emergency Registration**: Generate temporary emergency IDs (`TEMP-XXXX`) for trauma and walk-in admissions without initial paperwork.
- **Patient Check-in**: Look up patients instantly by UHID, phone number, or name.
- **OPD Queue & Bed Allocation**: Assign patients to available beds and scheduled clinics.

### 🔬 5. Laboratory Technician Portal
- **Test Management**: Review pending, processing, and completed blood tests, imaging, and microbiology orders.
- **Report Uploading**: Enter observation parameters, flag abnormal findings, and notify patients automatically.

### 💊 6. Pharmacy Management
- **Digital Token Dispenser**: Validate 6-digit prescription security tokens to review prescribed medications and mark orders as dispensed.
- **Medicine Inventory**: Real-time batch number, expiry date tracking, low-stock threshold alerts, and pricing controls.

### 🤖 7. Aarogya AI Clinical Assistant
- **AI Triage & Symptom Checker**: Multi-symptom analysis powered by OpenAI (`gpt-4o-mini`) calculating urgency levels, red flags, self-care measures, and suggested specialist departments.
- **Floating Health Chatbot**: 24/7 conversational assistance for medical questions, medication instructions, and navigation.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router & Server Actions) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) with Custom Health Glassmorphism UI |
| **Database** | [Supabase PostgreSQL](https://supabase.com/) |
| **Authentication** | [NextAuth.js](https://next-auth.js.org/) (JWT Session Strategy & Bcrypt) |
| **AI Integration** | [OpenAI API](https://openai.com/) (`gpt-4o-mini`) |
| **Icons & Charts** | [Lucide React](https://lucide.dev/) & [Recharts](https://recharts.org/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🗄️ Database Architecture (Supabase Postgres)

The system runs on **14 interconnected PostgreSQL relational tables**:

```
hospitals
├── users (Admin, Doctor, Receptionist, Lab Tech, Pharmacy, Patient)
├── patients (UHID, Demographics, Blood Group, Allergies, Medical History)
│   ├── family_members
│   ├── appointments
│   ├── prescriptions
│   ├── lab_reports
│   ├── bills
│   ├── medical_records
│   └── access_requests
├── beds
├── medicines (Inventory)
├── emergency_registrations
└── notifications
```

---

## 🚀 Quick Start & Installation

### 1. Clone Repository
```bash
git clone https://github.com/Bhavya-0801/Aarogya-Darpan.git
cd Aarogya-Darpan
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Supabase Database
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Copy and run the contents of [`supabase_schema.sql`](./supabase_schema.sql).

### 4. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# OpenAI Configuration (Aarogya AI Assistant)
OPENAI_API_KEY=sk-proj-your-openai-api-key
```

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Vercel

1. Push your code to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Under **Project Settings > Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_URL` (`https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET`
   - `OPENAI_API_KEY`
4. Click **Deploy**.

---

## 🔒 Security & Privacy

- **Role-Based Access Control (RBAC)**: Fine-grained middleware authorization for clinical, administrative, and patient scopes.
- **Patient Consent Architecture**: Doctors cannot view a patient's historical records without explicit patient authorization.
- **Password Security**: Passwords salted and hashed with `bcryptjs` (cost factor 12).
- **Service Role Isolation**: Server-side administrative operations execute via secure Supabase service-role keys without exposing credentials to the client.

---

## 👨‍💻 Author

**Bhavya Jindal**
- GitHub: [@Bhavya-0801](https://github.com/Bhavya-0801)
- Project: [Aarogya Darpan](https://github.com/Bhavya-0801/Aarogya-Darpan)

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
