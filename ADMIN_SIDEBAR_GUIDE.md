# 🛡️ Central Admin Panel Navigation Guide

This document explains the high-level management and oversight tools available in the CloudSpace Central Admin Panel.

---

## 🏛️ MAIN OPERATIONS

### 📊 Dashboard (Admin)
The Admin Dashboard provides a high-level bird's-eye view of the entire system's health and activity. It aggregates critical metrics such as total registered users, active sessions, and global storage consumption into a single interactive interface. Administrators can monitor real-time trends, identify peak usage periods, and stay informed about the latest system alerts. It is the primary landing page for infrastructure monitoring and general oversight.

### 👥 User Management
User Management is the central hub for controlling account access and permissions across the platform. Administrators can view detailed profiles, reset passwords, change user roles (Admin vs. User), and deactivate accounts if security policies are violated. This tool also allows for bulk actions and searching for specific users based on email or registration date. It ensures that the platform remains a safe and well-regulated environment for all members.

### 💾 Storage Monitor
The Storage Monitor provides detailed visibility into how much physical space is being consumed across the entire S3 bucket or local environment. It breaks down usage by individual users, identifies unusually large files, and helps predict when the system might need infrastructure scaling. This feature is essential for cost management and ensuring that no single user is monopolizing system resources. It provides the data needed to make informed decisions about storage quotas and limits.

---

## 💼 BUSINESS OPERATIONS

### 🏢 Subscription Plans
The Subscription Plans section is where administrators define the tier structure of the platform, such as "Free," "Professional," and "Enterprise." You can configure storage limits, AI task quotas, and pricing details for each specific plan. Changes made here are reflected instantly across the user dashboard and payment checkout pages. It allows the business model to be flexible and evolve as the platform grows.

### 💳 Subscribers
The Subscribers view focuses specifically on the revenue-generating side of the platform, listing all users currently on a paid subscription. Administrators can view payment histories, check renewal dates, and handle manual overrides or refunds if necessary. It integrates directly with payment processors (like Razorpay) to ensure financial records are accurate. This tool is vital for customer support when dealing with billing inquiries or plan transitions.

---

## ⚙️ SYSTEM & SECURITY

### 📋 Security Audit Logs
Security Audit Logs track every sensitive action taken within the system, such as failed login attempts, file deletions, or permission changes. This create a permanent, tamper-proof record (audit trail) that is essential for compliance and investigating potential security breaches. Administrators can filter these logs by user, date, or event type to quickly pinpoint suspicious activity. It is the core transparency tool for maintaining platform integrity.

### 📈 Analytics & Reports
Analytics & Reports provide deep data insights into how the platform is being used over time. This section generates downloadable reports on storage growth, AI assistant usage frequency, and user retention metrics. It goes beyond simple monitoring to provide the strategic data needed for long-term planning and feature development. It is designed to turn raw system data into actionable business intelligence.

### ⚙️ System Settings
System Settings is the configuration engine for the entire application environment. Here, administrators can update global maintenance modes, API keys, email server configurations, and general branding elements. Access to this section is highly restricted, as changes here can affect the stability and connectivity of the entire platform. It provides the "knobs and dials" needed to keep the technical infrastructure running smoothly.
