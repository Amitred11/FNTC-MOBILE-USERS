# 🐻 Fibear Network Technologies Corp. - A Full-Stack Capstone Project

![Project Status: Educational Capstone](https://img.shields.io/badge/Status-Educational%20Capstone-blueviolet)

This repository contains the full-stack source code for the **Fibear Internet Service** application, developed as a comprehensive educational capstone project. It serves as a practical demonstration of modern application development, from backend API design to a polished cross-platform mobile user experience.

---

## 🎯 Project Purpose & Learning Outcomes

The primary goal of this capstone was to design, build, and deploy a complete, real-world application from scratch. This project showcases proficiency in the following areas:

*   **🌐 Full-Stack Development:** Integrating a React Native frontend with a Node.js backend.
*   **🔐 API Design & Security:** Creating a secure and scalable RESTful API with JWT-based authentication.
*   **💾 Database Management:** Designing NoSQL schemas and performing complex queries with MongoDB and Mongoose.
*   **📱 Mobile UI/UX:** Building an intuitive, responsive, and aesthetically pleasing user interface using React Native and modern design principles.
*   **🔄 State Management:** Utilizing React's Context API for managing global state (auth, theme, data).
*   **☁️ Third-Party Integrations:** Interfacing with external services like Cloudinary for image storage and Expo for push notifications.

---

## ✨ Key Features

### 📱 Customer Mobile Application
*   **🔐 User Authentication:** Secure Sign Up, Login, and Google Sign-In with robust session management.
*   **👤 Profile Management:** View and edit personal information, upload profile photos via Cloudinary.
*   **🚀 Subscription Management:** Browse plans, subscribe to services, and track subscription status (active, pending, suspended, cancelled).
*   **💳 Billing & Payments:** View current and past bills, submit GCash payment proof, and generate cash payment vouchers with QR codes.
*   **💬 Customer Support:** Create and manage support tickets, engage in live chat with agents, and receive real-time push notifications.
*   **⭐ Feedback System:** Submit and manage public feedback to share your experience.

---

## 🛠️ Technology Stack

| Category      | Technology                                                                                                  |
| :------------ | :---------------------------------------------------------------------------------------------------------- |
| **Backend**   | Node.js, Express.js, MongoDB, Mongoose, JWT, Bcrypt.js                                                      |
| **Frontend**  | React Native (Expo), React Navigation, Context API, Axios                                                   |
| **Cloud**     | Cloudinary (Image/Proof Storage), Expo Push Notifications                                                   |
| **Security**  | Helmet, CORS, Express-Mongo-Sanitize, HPP, XSS-Clean, Rate-Limiting                                         |
| **UI/UX**     | React Native Paper, Animatable, Linear Gradient, Date-fns                                                   |

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites
*   Node.js (LTS version) & npm/Yarn
*   MongoDB Atlas account
*   Cloudinary account
*   Google Cloud Project (for Google Sign-In)
*   Expo Go app on your mobile device

### 1. Backend Setup ⚙️

1.  **Clone & Navigate:**
    ```bash
    git clone https://github.com/Amitred11/FNTC-Mobile
    cd FNTC-Mobile/backend
    ```
2.  **Install Dependencies:** `npm install`
3.  **Create `.env` file:** Create a `.env` file in the `backend` root and populate it using `.env.example` as a template with your credentials for MongoDB, JWT, Cloudinary, and Google OAuth.
4.  **Start Server:** `npm run dev`

### 2. Frontend Setup 📱

1.  **Navigate to Frontend:**
    ```bash
    cd ../frontend
    ```
2.  **Install Dependencies:** `npm install`
3.  **Configure API URL:** Open `frontend/services/api.js` and set `API_BASE_URL` to your local IP address (e.g., `http://192.168.1.5:5000/api`). **Do not use `localhost`**.
4.  **Run the App:**
    ```bash
    npx expo start
    ```
    Scan the QR code with the Expo Go app to launch the application.

---

## 📄 Disclaimer

**This is an educational capstone project and is intended for our Community Partner.**

*   The application is for our Community Partner which is an Internet Service Provider.
*   All Datas and Functions are solely for our Community Partner

---

## 🎓 Author

This project was created by **Amitred11** as the culmination of their studies, showcasing the practical application of software engineering principles.

---

## 📜 License

---

## 📜 License and Usage Rights

**© 2024 Amitred11. All Rights Reserved.**

This software and its associated source code are the proprietary property of the author and were developed in partnership with **Fibear Network Technologies Corp.**.

**Usage by the Community Partner:**
Our community partner, **Fibear Network Technologies Corp.**, is granted a non-exclusive, perpetual, royalty-free license to use, modify, and deploy this software for their internal operational purposes.

**General Usage Prohibited:**
All other parties are strictly prohibited from copying, distributing, modifying, or using this software for any commercial or non-commercial purpose without the express written permission of the author. This project is **not** open-source.
