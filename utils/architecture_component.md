# ITSM Application Architecture Diagram

```mermaid
graph TB
    subgraph "User Interface"
        UI[React Components]
        Pages[App Router Pages]
        Layouts[Layouts]
        Forms[Forms & Tables]
    end

    subgraph "Next.js Layer"
        ServerActions[Server Actions]
        APIRoutes[API Routes]
        Middleware[Middleware]
    end

    subgraph "Business Logic"
        Services[Service Layer]
        Validations[Validation]
        Permissions[Permission Checks]
        Audit[Audit Logging]
    end

    subgraph "Data Layer"
        Prisma[Prisma ORM]
        Models[Data Models]
        Migrations[Migrations]
    end

    subgraph "Authentication & Authorization"
        Auth[Auth.js]
        Sessions[Sessions]
        Roles[Role Management]
        Perms[Permissions]
    end

    subgraph "Persistence"
        DB[(Database<br/>SQLite/PostgreSQL)]
        Cache[Cache Layer]
    end

    subgraph "External Integrations"
        Email[Email Service]
        Notifications[Push Notifications]
        Analytics[Analytics]
    end

    UI --> Pages
    Pages --> ServerActions
    Pages --> APIRoutes
    ServerActions --> Services
    APIRoutes --> Services
    Services --> Prisma
    Services --> Auth
    Prisma --> DB
    Auth --> DB
    Services --> Email
    Services --> Notifications
    Services --> Analytics
    
    Middleware --> Auth
    Auth --> Roles
    Roles --> Perms
    Perms --> Services
    
    Services --> Audit
    Audit --> DB
    
    style UI fill:#e1f5fe
    style Pages fill:#e1f5fe
    style ServerActions fill:#f3e5f5
    style APIRoutes fill:#f3e5f5
    style Services fill:#e8f5e8
    style Prisma fill:#fff3e0
    style DB fill:#ffebee
    style Auth fill:#fce4ec
    style Email fill:#e0f2f1
```

## Component Descriptions

### User Interface
- **React Components**: Reusable UI components (buttons, modals, tables)
- **App Router Pages**: Next.js 14+ pages using React Server Components
- **Layouts**: Shared layouts for consistent UI structure
- **Forms & Tables**: Form handling and data display components

### Next.js Layer
- **Server Actions**: Direct server functions called from client components
- **API Routes**: RESTful endpoints for external integrations
- **Middleware**: Request interception for auth, logging, etc.

### Business Logic
- **Service Layer**: Core business logic and use cases
- **Validation**: Input validation and sanitization
- **Permission Checks**: Fine-grained access control
- **Audit Logging**: Tracking system activities

### Data Layer
- **Prisma ORM**: Database abstraction and query building
- **Data Models**: TypeScript definitions for database entities
- **Migrations**: Schema version control

### Authentication & Authorization
- **Auth.js**: NextAuth.js implementation for authentication
- **Sessions**: User session management
- **Role Management**: Role-based access control
- **Permissions**: Fine-grained permission system

### Persistence
- **Database**: SQLite (development) / PostgreSQL (production)
- **Cache Layer**: Potential caching layer for performance

### External Integrations
- **Email Service**: Transactional email delivery
- **Push Notifications**: Real-time user notifications
- **Analytics**: Usage tracking and reporting

## Data Flow
1. User interacts with UI components
2. Actions trigger Server Actions or API calls
3. Requests pass through middleware for authentication
4. Business logic services process requests
5. Services interact with data layer via Prisma
6. Data persisted to database
7. Results returned to UI
8. External services notified as needed