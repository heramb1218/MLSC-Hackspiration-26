# 🏦 CampusTrust

### Decentralized Reputation-Linked Microcredit Ecosystem (Hybrid Web2 + Algorand)

------------------------------------------------------------------------

## 📌 Overview

CampusTrust is a hybrid Web2 + Web3 microcredit platform that enables
students to access small loans based on a reputation-driven eligibility
model.

The system combines:

-   **Web2 infrastructure** for user management, database storage, and
    API processing\
-   **Algorand Layer-1 smart contracts (ASC1)** for decentralized loan
    enforcement and reputation updates

The goal is to create a transparent, trust-minimized lending ecosystem
within a campus environment.

------------------------------------------------------------------------

## 🎯 Problem Statement

Traditional student lending systems lack:

-   Transparent eligibility criteria\
-   Automated trust enforcement\
-   Reputation-based microcredit access\
-   On-chain accountability

CampusTrust addresses these gaps by combining structured backend logic
with blockchain-based enforcement.

------------------------------------------------------------------------

## 🏗 System Architecture

CampusTrust follows a layered hybrid architecture:

### 1️⃣ Frontend Layer (Vercel)

-   Built using React / JavaScript
-   Connects to Backend REST APIs
-   Connects to Algorand blockchain via JS SDK
-   Integrates Pera Wallet for transaction signing

### 2️⃣ Backend Layer (Railway)

-   Node.js + Express
-   Handles user registration & authentication
-   Loan eligibility validation
-   Reputation updates
-   Pool balance management
-   Communicates with MongoDB Atlas

### 3️⃣ Database Layer (MongoDB Atlas)

Collections:

**Users** - name - email - password - walletAddress - reputationScore
(default: 50)

**Loans** - userId - amount - status (active / repaid)

**Pool** - poolBalance

### 4️⃣ Blockchain Layer (Algorand Layer-1)

Stateful Smart Contract (ASC1 written in PyTeal)

Local State (per user): - reputation_score - has_active_loan -
active_loan_amount - loan_due_round

Global State: - pool_balance - penalty_rate - reward_rate

Smart Contract Methods: - borrow() - repay() - contribute()

Uses: - Global.round() for loan deadlines\
- Atomic transaction groups for fund movements\
- On-chain validation of credit rules

------------------------------------------------------------------------

## 🔐 Loan & Reputation Logic

### Borrow Rules

-   Reputation \> 40\
-   No active loan\
-   Requested amount within limit\
-   Pool balance sufficient

### Loan Limits

-   Reputation \< 40 → Not eligible\
-   40--69 → Max 500 units\
-   ≥ 70 → Max 1000 units

### Repayment Rules

-   On-time repayment → +10 reputation\
-   Late repayment → −15 reputation\
-   Loan state cleared after repayment

### Contribution

-   Adds to pool balance\
-   +5 reputation

------------------------------------------------------------------------

## 🚀 Deployment

### Frontend

-   Hosted on **Vercel**

### Backend

-   Hosted on **Railway**

### Database

-   Hosted on **MongoDB Atlas**

### Blockchain

-   Deployed on **Algorand TestNet**

------------------------------------------------------------------------

## 🔄 End-to-End Flow

1.  User registers and connects wallet\
2.  Backend validates and stores user data\
3.  User requests loan\
4.  Backend validates eligibility\
5.  Frontend triggers Algorand AppCall\
6.  Smart contract enforces rules\
7.  Pool balance and reputation updated\
8.  Dashboard reflects updated state

------------------------------------------------------------------------

## 🛠 Tech Stack

Frontend: - React - JavaScript - Algorand JS SDK - Pera Wallet

Backend: - Node.js - Express - Mongoose

Database: - MongoDB Atlas

Blockchain: - Algorand Layer-1 - PyTeal (ASC1 Smart Contract)

Deployment: - Vercel - Railway

------------------------------------------------------------------------

## 📈 Future Improvements

-   Fully migrate eligibility logic on-chain\
-   Add reward token (ASA) incentives\
-   DAO-style pool governance\
-   Credit score visualization dashboard\
-   Production security hardening

------------------------------------------------------------------------

## 🏁 Conclusion

CampusTrust establishes a scalable hybrid infrastructure combining
traditional backend systems with Algorand-based smart contract
enforcement.

The Web2 layer ensures usability and structured data persistence, while
the blockchain layer guarantees transparent, tamper-resistant financial
logic.

This architecture creates a secure, reputation-driven microcredit
ecosystem suitable for campus environments.







Here are the screenshots of deployment. 
Railway - https://mlsc-hackspiration-26-production.up.railway.app/
Vercel - https://campustrust-chi.vercel.app/
