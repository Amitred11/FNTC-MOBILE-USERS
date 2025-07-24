# Fibear Internet Service - Full Stack Application

## Project Overview

**Fibear Internet Service** is a modern, full-stack application designed to provide robust management for an internet service provider (ISP) and an intuitive mobile application for its customers. This project demonstrates a comprehensive solution for subscription management, billing, customer support, and administrative operations.

The customer-facing mobile app allows users to subscribe to plans, manage their profile, pay bills, raise support tickets, and chat with agents. The admin-facing dashboard (also a React Native app) provides tools for managing subscriptions, tickets, live chats, and broadcasting announcements.

## Key Features

### Customer Mobile Application
*   **User Authentication:** Secure Sign Up, Login, and Google Sign-In.
*   **Profile Management:** View and edit personal information, upload profile photos.
*   **Subscription Management:** Browse plans, subscribe to services, track subscription status (active, pending, suspended, cancelled).
*   **Billing & Payments:** View current and past bills, submit GCash payment proof, generate cash payment vouchers.
*   **Customer Support:** Create and manage support tickets, engage in live chat with agents, receive push notifications.
*   **Feedback System:** Submit and manage public feedback.

### Admin Dashboard Application
*   **Dashboard Overview:** Live stats on total users, active subscriptions, and open tickets.
*   **Subscription Approval:** Review and approve/decline pending customer subscriptions.
*   **Ticket Management:** View all support tickets, filter by status, reply to users, change ticket status.
*   **Live Chat Support:** View active chat sessions, engage in real-time chat with customers, close sessions.
*   **User Management:** Search and view customer profiles.
*   **Broadcast Messaging:** Send push notifications to all or targeted customer segments.

## Technology Stack

### Backend
*   **Node.js:** JavaScript runtime environment.
*   **Express.js:** Web framework for building RESTful APIs.
*   **MongoDB:** NoSQL database for flexible data storage.
*   **Mongoose:** ODM (Object Data Modeling) library for MongoDB.
*   **JWT (JSON Web Tokens):** For secure authentication and authorization.
*   **Bcrypt.js:** For password hashing.
*   **Cloudinary:** Cloud-based image and video management (for profile photos, payment proofs).
*   **Expo Push Notifications:** For sending push notifications to mobile clients.
*   **Axios:** HTTP client for making API requests.
*   **Winston:** Robust logging library.
*   **Helmet, CORS, Express-Mongo-Sanitize, HPP, XSS-Clean:** Security middleware.
*   **Express-Rate-Limit:** For API rate limiting.
*   **Dotenv:** For loading environment variables.

### Frontend (React Native - Expo)
*   **React Native:** Cross-platform mobile development framework.
*   **Expo:** Framework and platform for universal React applications.
*   **React Navigation:** For powerful navigation.
*   **Context API:** For global state management (Auth, Theme, Subscription, Alert, Message).
*   **Axios:** HTTP client for API requests.
*   **React Native Paper:** Material Design components for UI.
*   **React Native View Shot:** To capture views as images (for payment vouchers).
*   **Expo ImagePicker, MediaLibrary, Sharing:** For device integrations.
*   **React Native Qrcode SVG:** For QR code generation.
*   **Animatable:** For declarative animations.
*   **Date-fns:** For date manipulation and formatting.
*   **React Native Keyboard Aware Scroll View:** For smooth keyboard handling.

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites
*   Node.js (LTS version recommended)
*   npm or Yarn
*   MongoDB Atlas account (or local MongoDB instance)
*   Cloudinary account
*   Google Cloud Project (for Google Sign-In)
*   Expo Go app on your mobile device or a simulator/emulator.

### 1. Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone [https:](https://github.com/Amitred11/FNTC-Mobile)
    cd fibear-server # Or whatever your backend folder is named
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    In the root of your backend directory, create a file named `.env` (note the dot).
    Copy the contents from the `backend/.env.example` file (you will need to create this example file or refer to the `.env` section in this README) and fill in your actual credentials.

    ```env
    # Server Configuration
    PORT=5000
    NODE_ENV=development # Change to 'production' for deployment

    # MongoDB Connection String from MongoDB Atlas
    MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority

    # JWT Secrets (Generate strong, random strings)
    JWT_SECRET=your_super_secret_jwt_key
    REFRESH_TOKEN_SECRET=your_super_secret_refresh_key

    # Cloudinary Credentials
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret

    # Google OAuth Client IDs (for the customer app)
    GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
    GOOGLE_ANDROID_CLIENT_ID=your_android_client_id.apps.googleusercontent.com
    GOOGLE_IOS_CLIENT_ID=your_ios_client_id.apps.googleusercontent.com
    ```
    **Security Note:** Make sure `.env` is listed in your `.gitignore` file to prevent it from being pushed to version control.

4.  **Start the backend server:**
    ```bash
    npm start
    # Or for development with nodemon:
    # npm run dev
    ```
    The server should start on `http://localhost:5000` (or your specified PORT).

### 2. Frontend Setup (Customer App / Admin App)

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../fibear-frontend # Or whatever your frontend folder is named
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure API URL:**
    Open `frontend/services/api.js`. Change `API_BASE_URL` to point to your backend server.
    *   For local development (if your backend is running on your machine): Use your local IP address (e.g., `http://192.168.1.5:5000/api`). **Do NOT use `localhost`**, as your mobile device/emulator cannot resolve it.
    *   For production: Use your deployed backend URL (e.g., `https://your-backend-app.onrender.com/api`).

4.  **Run the Expo app:**
    ```bash
    npx expo start
    ```
    This will open the Expo Dev Tools in your browser. You can then scan the QR code with your Expo Go app (Android/iOS) or open it in a simulator.

5.  **Important for Assets:** If you added `ph_locations.json` or other large assets during development, ensure they are properly bundled by running:
    ```bash
    npx expo start --clear
    ```
    This clears the Metro bundler cache.

## Database Seeding (Initial Data Population)

Your backend includes a seeder script to populate initial data for plans.

1.  **Ensure your backend server is NOT running.**
2.  **Navigate to your backend directory.**
3.  **Seed the plans data:**
    ```bash
    npm run seed
    ```
    This will delete any existing plan data and insert the default Fibear plans.
4.  **To delete all plan data:**
    ```bash
    npm run seed:destroy
    ```

## Deployment Notes (Example: Render.com)

This application is designed to be easily deployable to platforms like Render.com.

1.  **GitHub:** Push your backend and frontend code to separate GitHub repositories.
2.  **Backend (Web Service on Render):**
    *   Connect your backend GitHub repository.
    *   Set build command: `npm install`
    *   Set start command: `node server.js`
    *   **Crucially:** Add all environment variables from your `.env` file to Render's environment variable section. This includes `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `GOOGLE_*`.
    *   Ensure `NODE_ENV` is set to `production` in Render's environment variables.
3.  **Database (MongoDB on Render):**
    *   Create a free MongoDB service on Render.
    *   Copy its "Internal Connection String" and use it as your `MONGODB_URI` in the backend service's environment variables.
4.  **Frontend (Expo EAS Build):**
    *   For a production mobile app, you'll use Expo Application Services (EAS) to build the native binaries (`.apk`, `.ipa`).
    *   Install `eas-cli`: `npm install -g eas-cli`
    *   Login to Expo: `eas login`
    *   Configure build: `eas build:configure`
    *   Build for Android/iOS: `eas build -p android --profile production` or `eas build -p ios --profile production`
    *   Update `frontend/services/api.js` with your deployed backend URL.

## Folder Structure

```
.
├── backend/                  # Node.js Express API
│   ├── .env.example          # Example environment variables
│   ├── models/               # Mongoose schemas for MongoDB
│   ├── controllers/          # Business logic for API endpoints
│   ├── middleware/           # Express middleware (auth, validation, error handling)
│   ├── routes/               # API route definitions
│   ├── utils/                # Helper functions (e.g., mailer)
│   ├── logger.js             # Centralized Winston logger
│   ├── seeder.js             # Database seeder script
│   └── server.js             # Main Express server entry point
│
└── frontend/                 # React Native Expo Application
    ├── assets/               # Static assets (images, data files)
    │   ├── data/             # JSON data files (e.g., PH locations)
    │   └── images/           # Image assets
    ├── components/           # Reusable UI components
    ├── contexts/             # React Context API for global state
    ├── navigation/           # React Navigation setup
    ├── screens/              # Individual application screens
    ├── services/             # API client, notification service, location service
    ├── texts/                # Legal text content (Terms, Privacy)
    ├── utils/                # Utility functions (e.g., permissions)
    ├── App.js                # Main application entry point
    └── app.json / package.json # Expo/NPM configuration
```

---

## Credits

Developed by Amitred11 as a demonstration of a full-stack application for an ISP.

## License

© 2025 FiBear Network Technologies Corp. All Rights Reserved.

This software and its associated source code are the proprietary property of FiBear Network Technologies Corp. All rights are expressly reserved.

You are not permitted to copy, reproduce, distribute, display, perform, or create derivative works of this software or any part thereof, without the prior express written permission of FiBear Network Technologies Corp. Any unauthorized use is strictly prohibited and may result in legal action.
```
