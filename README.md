# ITSM Portal - Modern IT Service Management System

A full-featured IT Service Management (ITSM) web application built with Next.js 14, TypeScript, Tailwind CSS, and Prisma. Implements the requirements from the provided specification document.

## Features Implemented

### ✅ Ticket & Incident Management (MUST)
- Omnichannel ticket creation (Portal, Email, Phone, Chat)
- Full ticket lifecycle workflow (New → Assigned → In Progress → Resolved → Closed)
- SLA management with configurable response/resolution times
- Priority matrix (Impact × Urgency) with automated priority calculation
- Ticket assignment, comments, and internal notes

### ✅ Self-Service & Knowledge Base (SHOULD)
- User portal for ticket submission and tracking
- Knowledge base with articles, categories, and tags
- Full-text search across tickets, assets, and documentation
- Article helpfulness tracking and view counters

### ✅ Asset & CMDB (SHOULD)
- Asset inventory management (hardware, software, network devices)
- Asset status tracking (Active, Maintenance, Retired, Lost)
- Warranty and license management
- Direct asset-ticket linkage for incident correlation

### ✅ Automation & AI (COULD)
- Rule-based automation (auto-routing, escalations, notifications)
- Configurable triggers, conditions, and actions
- AI chatbot integration for first-level support (placeholder)
- Scheduled automation (daily cleanup, notifications)

### ✅ Integration & Security (MUST)
- SSO configuration (Azure AD, Okta) in settings
- Granular role-based access control (Admin, Agent, End User)
- GDPR-compliant data protection settings
- Session management and MFA support

### ✅ Reporting & Analytics (SHOULD)
- Dashboard with key metrics (ticket volume, SLA compliance, CSAT)
- Real-time visualization of KPIs
- Export functionality (CSV, PDF)
- Agent performance tracking

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (modern, accessible components)
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), compatible with PostgreSQL/MySQL
- **Authentication**: Next-Auth (ready for SSO integration)
- **Styling**: Tailwind CSS with CSS variables, dark/light theme
- **Icons**: Lucide React

## Project Structure

```
itsm-app/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (tickets, assets, etc.)
│   ├── tickets/           # Ticket management pages
│   ├── assets/            # Asset management pages
│   ├── knowledge/         # Knowledge base pages
│   ├── users/             # User management pages
│   ├── analytics/         # Reporting dashboards
│   ├── automation/        # Automation rules
│   └── settings/          # System configuration
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui components
│   ├── sidebar.tsx       # Main navigation sidebar
│   ├── topbar.tsx        # Top navigation bar
│   └── theme-provider.tsx # Dark/light theme provider
├── lib/                   # Utility libraries
│   ├── prisma.ts         # Prisma client instance
│   └── utils.ts          # Shared utilities
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database models
│   └── migrations/       # Generated migrations
└── public/               # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm/bun
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd itsm-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

4. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./itsm.db"

# Next.js
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Optional: SSO integration
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""
OKTA_CLIENT_ID=""
OKTA_CLIENT_SECRET=""
OKTA_ISSUER=""
```

## Usage

1. **Dashboard**: Overview of key metrics and recent activity
2. **Tickets**: Create, assign, and manage support tickets
3. **Assets**: Track IT hardware and software inventory
4. **Knowledge Base**: Create and publish help articles
5. **Users**: Manage user accounts and permissions
6. **Analytics**: View reports and performance metrics
7. **Automation**: Configure automated workflows
8. **Settings**: System configuration and preferences

## Design Philosophy

- **Modern UI**: Clean, responsive interface with dark/light mode
- **Intuitive Navigation**: Sidebar with quick access to all features
- **Accessibility**: Built with accessible components (shadcn/ui)
- **Performance**: Optimized with Next.js static and dynamic rendering
- **Scalability**: Modular architecture for easy feature expansion

## Future Enhancements

- Real-time notifications with WebSockets
- Advanced reporting with custom dashboards
- Mobile application (React Native)
- Integration with monitoring tools (Nagios, Zabbix)
- Advanced AI features (predictive analytics, smart routing)

## License

MIT

## Acknowledgments

- [Next.js](https://nextjs.org) for the React framework
- [shadcn/ui](https://ui.shadcn.com) for the component library
- [Prisma](https://prisma.io) for the database ORM
- [Tailwind CSS](https://tailwindcss.com) for styling