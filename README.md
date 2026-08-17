MSMEAssist AI

Intelligent Business Automation for MSMEs

Turn customer conversations into business operations.

MSMEAssist AI is an AI-powered business assistant designed to help Micro, Small and Medium Enterprises automate customer interactions, product discovery, ordering, and business management through a simple conversational experience.

It combines Generative AI, multilingual communication, structured business data, and an intuitive management dashboard to reduce repetitive manual work and help MSME owners focus on growing their business.

⸻

🚀 Problem Statement

Small businesses often manage customer communication manually.

They spend significant time:

* Answering repetitive customer questions
* Sharing product information
* Taking orders manually
* Collecting customer details
* Tracking orders through conversations
* Managing multiple customers simultaneously
* Handling customers who communicate in different languages

For many MSMEs, traditional enterprise software can also be expensive, complicated, or difficult to adopt.

The core problem

MSMEs need simple, affordable and intelligent automation that works around the way they already communicate with customers.

⸻

💡 Our Solution

MSMEAssist AI acts as an intelligent digital assistant between customers and businesses.

The customer can communicate naturally with the AI, while MSMEAssist handles the repetitive operational work in the background.

Core workflow

Customer
   ↓
Zavu
   ↓
MSMEAssist AI
   ↓
Gemini AI
   ↓
Business / Product Data
   ↓
Order Processing
   ↓
Supabase Database
   ↓
Business Dashboard

⸻

✨ Key Features

🤖 AI Customer Assistant

Understands customer questions and provides conversational responses using Generative AI.

🌐 Multilingual Communication

Supports natural conversations across:

* English
* Hindi
* Gujarati
* Hinglish / Gujlish-style communication

🛍️ Smart Product Discovery

Customers can interact with the business conversationally to discover available products and information.

🛒 Conversational Ordering

Customers can provide their requirements naturally instead of filling complicated forms.

👤 Customer Information

The system collects and associates customer information with their orders.

📦 Order Management

Orders are converted from conversations into structured business records.

📊 Business Dashboard

Business owners can view and manage customer/order information through a centralized dashboard.

⚡ 24/7 Automation

The AI assistant can handle repetitive customer interactions without requiring the business owner to respond manually every time.

⸻

🧠 How It Works

1. Customer starts a conversation
              ↓
2. MSMEAssist identifies the customer's intent
              ↓
3. Gemini AI generates an appropriate response
              ↓
4. Business/product information is retrieved
              ↓
5. Customer continues the conversation
              ↓
6. Customer provides order details
              ↓
7. Order information is stored
              ↓
8. Business owner views the order
   through the dashboard

⸻

🏗️ System Architecture

                    ┌─────────────────┐
                    │    Customer     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      Zavu       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ MSMEAssist AI   │
                    │   Application   │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
        ┌─────────────────┐     ┌─────────────────┐
        │   Gemini API    │     │    Supabase     │
        │   AI Engine     │     │   PostgreSQL    │
        └─────────────────┘     └────────┬────────┘
                                         │
                                         ▼
                                ┌─────────────────┐
                                │ Business        │
                                │ Dashboard       │
                                └─────────────────┘

⸻

🛠️ Technology Stack

Frontend

* React.js
* JavaScript
* HTML5
* CSS3

Backend

* Node.js
* Express.js
* REST APIs

Artificial Intelligence

* Google Gemini API
* Generative AI
* Prompt Engineering
* Natural Language Understanding
* Multilingual AI

Database

* Supabase
* PostgreSQL
* Supabase JavaScript Client

Authentication

* Supabase Authentication

Communication

* Zavu

Development

* Visual Studio Code
* Git
* GitHub

⸻

🗄️ Data Management

The system uses structured data to manage business operations.

Major data entities include:

Business
   │
   ├── Products
   │
   ├── Customers
   │
   └── Orders
          │
          └── Order Items

This allows conversational interactions to be converted into structured business information.

⸻

🌍 Target Users

MSMEAssist AI can be adapted for multiple types of small businesses, including:

* 🏪 Retail shops
* 🏥 Clinics
* 🏋️ Gyms
* 🍽️ Restaurants
* 💇 Salons
* 🛒 Local businesses
* 📦 Home-based businesses
* 🧑‍💼 Service providers

⸻

💥 Impact

MSMEAssist AI aims to help businesses:

* Reduce repetitive customer-support work
* Respond faster to customers
* Organize incoming orders
* Reduce manual data entry
* Improve customer experience
* Support multilingual customers
* Operate with greater efficiency
* Adopt AI without requiring advanced technical knowledge

Our vision

Make AI-powered business automation accessible to every MSME.

⸻

🔮 Future Scope

The current prototype can be expanded with:

* Online payment integration
* Automated invoice/PDF generation
* Appointment booking
* Inventory management
* Voice-based AI
* Advanced sales analytics
* Automated customer follow-ups
* Loyalty and rewards
* Additional Indian languages
* AI-powered sales recommendations
* Multi-business SaaS architecture
* Advanced business analytics

These features represent the planned future evolution of MSMEAssist AI.

⸻

💰 Business Model

MSMEAssist AI can be developed as a SaaS platform.

Possible plans

Starter

* Basic AI customer assistance
* Product management
* Basic order management

Professional

* Advanced AI automation
* Multilingual support
* Analytics
* Advanced customer management

Business

* Advanced integrations
* Higher usage limits
* Business analytics
* Premium automation

The pricing and final commercial model can be determined based on customer requirements and operating costs.

⸻

🔐 Security Considerations

The project follows basic security practices including:

* Environment variables for sensitive credentials
* .env files excluded from version control
* Authentication for protected functionality
* Database-level access controls
* Separation of application logic and credentials

Never commit API keys, passwords, service-role keys, or other secrets to GitHub.

⸻

📁 Project Structure

A simplified structure of the project:

MSMEAssist-ai/
│
├── frontend/
│
├── backend/
│
├── components/
│
├── public/
│
├── .gitignore
├── package.json
├── README.md
└── ...

Project structure may vary depending on the current implementation.

⸻

⚙️ Getting Started

1. Clone the repository

git clone https://github.com/yugfpatel/MSMEAssist-ai.git

2. Navigate into the project

cd MSMEAssist-ai

3. Install dependencies

npm install

If the project contains separate frontend/backend applications, install dependencies inside the respective directories as required.

4. Configure environment variables

Create a local .env file and add the required credentials.

Example:

GEMINI_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

Never upload the .env file to GitHub.

5. Run the application

Use the project’s configured development commands.

For example:

npm run dev

⸻

🧪 Testing

The application should be tested for:

* Customer conversations
* Multilingual responses
* Product discovery
* Customer information collection
* Order creation
* Order persistence
* Dashboard functionality
* Authentication
* Invalid/empty inputs
* API failures

⸻

🏆 Hackathon Project

MSMEAssist AI was developed as an AI-powered solution focused on improving automation and accessibility for Micro, Small and Medium Enterprises.

Project Goal

Empower MSMEs with AI-driven automation without making technology complicated.

⸻

👥 Team

MSMEAssist AI Team

* Yug — Team Leader
* Disha
* Shrusti
* Dev
* Akshay
* Lalita

Institution

P P Savani University

⸻

📜 License

This project is developed as a hackathon prototype.

The licensing and commercial usage terms can be defined by the project team before public production release.

⸻

⭐ MSMEAssist AI

AI for businesses. Automation for MSMEs. Growth for everyone.
