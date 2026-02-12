# CampusTrust - 60% MVP

This project contains the Frontend and Backend for the CampusTrust decentralized finance platform.

## Prerequisites

- **Node.js**: You must have Node.js installed. Download it from [nodejs.org](https://nodejs.org/).
- **MongoDB**: You need a MongoDB connection string. You can use a local instance or MongoDB Atlas. Update `backend/.env` with your connection string.

## Setup Instructions

### 1. Backend Setup (MacOS)

1.  **Open Terminal**: Press `Command + Space`, type "Terminal", and press Enter.

2.  **Install Node.js** (if not installed):
    It is recommended to use Homebrew. If you don't have Homebrew, install Node.js from [nodejs.org](https://nodejs.org/).
    If you have Homebrew:
    ```bash
    brew install node
    ```

3.  **Navigate to the project**:
    ```bash
    cd "Documents/Projects/CampusTrust - Blockchain/backend"
    ```
    *(Note: Adjust the path if you saved the project elsewhere)*

4.  **Install dependencies**:
    ```bash
    npm install
    ```

5.  **Start the server**:
    ```bash
    npm run dev
    ```
    The backend will run on `http://localhost:5001`.

### 2. Frontend Setup (MacOS)

1.  **Open a New Terminal Tab**: Press `Command + T` in your terminal window.

2.  **Navigate to the frontend folder**:
    ```bash
    cd "../frontend"
    ```
    *(Or if opening a fresh terminal: `cd "Documents/Projects/CampusTrust - Blockchain/frontend"`)*

3.  **Install dependencies**:
    ```bash
    npm install
    ```

4.  **Start the React app**:
    ```bash
    npm run dev
    ```
    The frontend will run on `http://localhost:5173` (or similar).

## Features Implemented

- **User Auth**: Signup and Login.
- **Dashboard**: View Reputation, Pool Balance, and Active Loans.
- **Pool Actions**: Contribute to the pool (increases reputation).
- **Borrowing**: Borrow from the pool (if balance suffices).
- **Repayment**: Repay loans to significantly boost reputation.

## Troubleshooting

### Connecting to Remote MongoDB (Windows Host)

If your database is on a Windows laptop (Laptop B), follow these steps to allow the Mac (Laptop A) to connect:

1.  **Find Windows Laptop IP**:
    -   Open Command Prompt (`cmd`).
    -   Type `ipconfig` and press Enter.
    -   Note the **IPv4 Address** (e.g., `192.168.1.15`).

2.  **Configure MongoDB for Remote Access**:
    -   Open File Explorer and navigate to `C:\Program Files\MongoDB\Server\7.0\bin\` (or your version).
    -   Open `mongod.cfg` with Notepad (Run as Administrator).
    -   Find the `net:` section and change verify `bindIp`:
        ```yaml
        net:
          port: 27017
          bindIp: 0.0.0.0  # CHANGE THIS from 127.0.0.1 to 0.0.0.0
        ```
    -   Save the file.

3.  **Restart MongoDB Service**:
    -   Press `Win + R`, type `services.msc`, and press Enter.
    -   Find **MongoDB Server**, right-click, and select **Restart**.

4.  **Update Backend Config (on Mac)**:
    -   Open `backend/.env`.
    -   Set `MONGO_URI=mongodb://<WINDOWS_IP_ADDRESS>:27017/campustrust`.

5.  **Firewall Check**:
    -   Ensure Windows Firewall allows connections on port 27017. You may need to add an Inbound Rule for TCP port 27017.

## Troubleshooting
- **MongoDB Connection Error**: Check your `MONGO_URI` in `backend/.env`.
- **API Errors**: Ensure the backend server is running while using the frontend.
