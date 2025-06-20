🏛️ Family Legacy
Family Legacy is a web application that allows users to preserve and share their family memories securely in the form of Vaults. Each user can sign up, create family vaults, upload images, and manage their legacy across generations.

🌐 Tech Stack
Frontend: HTML, CSS, EJS

Backend: Node.js, Express.js

Database: PostgreSQL

File Uploads: Multer, Cloudinary
🔐 Features
User Authentication: Secure login/signup system with hashed passwords.

Create Vaults: Users can create named family vaults.

Upload Images: Easily add family pictures to any vault.

Delete Vaults: Remove unwanted or outdated vaults.

Delete Images: Remove individual images from a vault.

Responsive UI: Clean and accessible interface across devices.

🧭 How It Works
🔑 Authentication
Users sign up using their email and password.

Passwords are securely hashed before storage.

JWT (or session-based) authentication is used to maintain login status.

📁 Vault Management
Each user can create multiple vaults (e.g., "Grandparents", "Vacations").

Images uploaded to a vault are stored and displayed under it.

Vaults and images can be deleted individually.

🚀 Setup Instructions
1. Clone the repository

git clone https://github.com/your-username/family-legacy.git
cd family-legacy
2. Install dependencies

npm install
3. Configure environment variables
Create a .env file in the root directory and add:


DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

4. Run the server

npm start
Server runs on http://localhost:3000
✍️ Author
Yash Sharma,Vedant,Viswajeet
