# InsightAI - AI-Powered Business Intelligence

InsightAI is a powerful platform for analyzing business data using natural language queries, automated insights, and anomaly detection.

## Project Structure

- **frontend/**: Next.js 14 application with Tailwind CSS and Radix UI components.
- **backend/**: FastAPI server integrated with DuckDB for high-performance data processing and LLM-powered insights.
- **data/**: Sample datasets for testing.

## Getting Started

### Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`
5. Create a `.env` file with your `GROQ_API_KEY`.
6. `uvicorn main:app --reload`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

Open [http://localhost:3000](http://localhost:3000) to use the application.
