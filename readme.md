# SIT Event Management System (SIT-EMS)

SIT-EMS is a comprehensive web application designed to serve as a central "Event Hub" for the School of Information Technology (SIT) at King Mongkut's University of Technology Thonburi (KMUTT).

This project aims to solve the challenges of using disparate registration systems (like Google Forms or the central One KMUTT system) by providing a single, unified platform. It is designed to manage the entire event lifecycle, catering to both internal users (students, faculty) and external users (high school students, general public).

## ✨ Key Features

The system is built with role-based access control for four distinct user roles: **Participant**, **Staff**, **Organizer**, and **Admin**.

* **Role-Based Access Control (RBAC):**
    * **Participant:** (Mobile-first) Can browse public events, register, and manage their profile.
    * **Staff:** (Mobile-first) Can see public and internal events, apply to be staff, and check-in attendees via QR code scanning.
    * **Organizer:** (Desktop) Can create, manage, and view statistics for their own events.
    * **Admin:** (Desktop) Has full oversight and can view and manage all events within the system.

* **Event Management:**
    * Organizers can create detailed events, specifying names, descriptions, locations, multiple sessions (with seat limits and points), images, registration/event dates, and staff requirements.
    * A card-based UI for participants to browse available public events.

* **Registration & Check-in:**
    * Seamless event booking for participants. New users are prompted to log in or register.
    * A mobile-friendly QR code scanning feature for Staff to manage attendee check-in at the venue.

* **Analytics & Feedback:**
    * Organizers and Admins can view event statistics, such as attendance rates and feedback summaries.
    * A built-in evaluation system to collect feedback from participants after an event.

* **Digital Certificates:**
    * An integrated system to issue and verify digital certificates for event attendees, enhancing transparency and credibility.

## 🛠️ Technology Stack

This project is built using a modern, decoupled architecture.

### Frontend (`sit-event-web`)

* **Framework:** **Vue.js 3** with **TypeScript**
* **Build Tool:** **Vite**
* **State Management:** **Pinia**
* **Styling:** **Tailwind CSS**
* **HTTP Client:** **Axios**
* **E2E Testing:** **Cypress**

### Backend (`sit-event-api`)

* **Framework:** **NestJS** (using TypeScript)
* **ORM:** **Prisma**
* **Database:** **PostgreSQL**
* **API Specification:** **OpenAPI 3.0**

## 📂 Project Structure

The project is organized into two main packages within a monorepo structure.

## 🚀 Getting Started

To run this project locally, you will need to set up both the backend and frontend services.

### 1. Backend API (`sit-event-api`)

1.  **Navigate to the API directory:**
    ```bash
    cd sit-event-api
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    * Create a `.env` file in this directory (this is ignored by Git).
    * Add your PostgreSQL connection string:
        ```
        DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
        ```

4.  **Run database migrations:**
    ```bash
    npx prisma migrate dev
    ```

5.  **Run the backend server (development mode):**
    ```bash
    npm run start:dev
    ```
    The API will be running on `http://localhost:3000`.

### 2. Frontend Web App (`sit-event-web`)

1.  **Navigate to the web directory:**
    ```bash
    cd sit-event-web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

## 📚 API Documentation

The complete API design, including all endpoints, models, and request/response schemas, is documented in the `api spec.txt` file using the **OpenAPI 3.0.0** standard.