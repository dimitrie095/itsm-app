# Erd Diagram

```mermaid
erDiagram
  User ||--o{ Ticket : "assignedTickets"
  Ticket ||--o{ User : "user"
  Comment ||--o{ User : "user"
  Comment ||--o{ Ticket : "ticket"
  KnowledgeBaseArticle ||--o{ User : "author"
  AutomationExecution ||--o{ AutomationRule : "rule"
  Account ||--o{ User : "user"
  Session ||--o{ User : "user"
  RolePermission ||--o{ Permission : "permission"
  UserPermission ||--o{ User : "user"
  UserPermission ||--o{ Permission : "permission"
```