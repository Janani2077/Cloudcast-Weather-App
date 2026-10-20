# CloudCast — AI-Powered Weather App

## Overview
CloudCast is a serverless weather application that retrieves current weather data and generates practical, AI-powered weather recommendations. Users can authenticate, save preferences, and configure scheduled email weather alerts.

**Live Demo:** https://cloudcast-weather-app.vercel.app/

## Features
- Current weather information using location coordinates.
- AI-generated recommendations using Google Gemini.
- User authentication with Amazon Cognito.
- Preference storage using Amazon DynamoDB.
- Scheduled email alerts using Amazon EventBridge and Amazon SES.
- Serverless backend hosted on AWS.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Hosting:** Vercel
- **Backend:** AWS Lambda, Amazon API Gateway
- **Authentication:** Amazon Cognito
- **Database:** Amazon DynamoDB
- **Weather API:** OpenWeather
- **AI:** Google Gemini
- **Email Notifications:** Amazon SES
- **Scheduling:** Amazon EventBridge

## Architecture
The frontend communicates with AWS API Gateway and Lambda for weather requests and preference management. A scheduled Lambda retrieves saved notification settings, fetches weather data, generates a recommendation, and sends email alerts.

## Deployment
The frontend is deployed on Vercel, while backend functions and supporting services run on AWS. Frontend updates are deployed through the configured GitHub integration; AWS backend changes are deployed separately.
