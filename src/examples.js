/**
 * Sample Mermaid Diagrams Library
 */

const EXAMPLES = [
  {
    id: 'miro_sketch',
    title: 'Miro Whiteboard Sketch Flow',
    category: 'flowchart',
    description: 'Hand-drawn flowchart with decision diamonds, process circles, and output rectangle matching Miro board',
    code: `flowchart LR
    D1{Decision 1} --> D2{Decision 2}
    D2 --> C1((Process A))
    C1 --> C2((Process B))
    C2 --> R[Execution Block]
    R -->|Loopback| D1`
  },
  {
    id: 'microservices',
    title: 'Cloud Microservices Architecture',
    category: 'flowchart',
    description: 'Multi-tier system with API Gateway, auth, cache, databases and worker queues',
    code: `flowchart TD
    subgraph ClientLayer ["Client Layer"]
        Web[Web Frontend / React]
        Mobile[Mobile iOS & Android]
        Partner[Partner 3rd-Party APIs]
    end

    subgraph Gateway ["Edge & Security"]
        WAF[WAF / Cloudflare]
        GW[Kong API Gateway]
        Auth[OAuth2 / JWT Provider]
    end

    subgraph CoreServices ["Core Microservices Cluster"]
        UserService[User Management]
        OrderService[Order Processing]
        PaymentService[Stripe Gateway]
        CatalogService[Product Catalog]
    end

    subgraph DataStorage ["High-Availability Data Layer"]
        UserDB[(PostgreSQL Primary)]
        RedisCache[(Redis Cluster)]
        OrderDB[(MongoDB Sharded)]
        KafkaQ[[Kafka Event Bus]]
    end

    Web --> WAF
    Mobile --> WAF
    Partner --> WAF
    WAF --> GW
    GW -->|Validate Token| Auth
    GW -->|Route Request| UserService
    GW -->|Route Request| OrderService
    GW -->|Route Request| CatalogService

    UserService --> RedisCache
    UserService --> UserDB
    OrderService --> OrderDB
    OrderService -->|Publish OrderPlaced| KafkaQ
    OrderService --> PaymentService
    KafkaQ -->|Async Event| CatalogService`
  },
  {
    id: 'oauth2_sequence',
    title: 'OAuth 2.0 Authorization Code Flow',
    category: 'sequence',
    description: 'Secure authentication flow with PKCE, tokens, and resource validation',
    code: `sequenceDiagram
    autonumber
    actor User as End User
    participant Browser as Web Client (SPA)
    participant AuthServer as Authorization Server
    participant Backend as API Resource Server

    User->>Browser: Click "Sign in with SSO"
    Browser->>AuthServer: GET /authorize (client_id, redirect_uri, code_challenge)
    AuthServer-->>User: Display Login & Consent Prompt
    User->>AuthServer: Submit Credentials & Consent
    AuthServer-->>Browser: 302 Redirect to redirect_uri with Auth Code
    Browser->>AuthServer: POST /oauth/token (code, code_verifier)
    AuthServer-->>Browser: 200 OK (Access Token & Refresh Token)
    Browser->>Backend: GET /api/v1/profile (Bearer Access Token)
    Backend->>AuthServer: Introspect / Verify JWT Signature
    AuthServer-->>Backend: Token Valid (scopes: read, write)
    Backend-->>Browser: 200 OK with User Profile Data
    Browser-->>User: Render Dashboard`
  },
  {
    id: 'ecommerce_erd',
    title: 'E-Commerce Database Schema',
    category: 'er',
    description: 'Relational data model with Users, Orders, Order Items, Products, and Reviews',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ REVIEW : writes
    CUSTOMER ||--|| WALLET : holds
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : ordered_in
    PRODUCT ||--o{ REVIEW : receives
    CATEGORY ||--o{ PRODUCT : categorizes

    CUSTOMER {
        uuid id PK
        string email UK
        string full_name
        string password_hash
        timestamp created_at
    }

    ORDER {
        uuid id PK
        uuid customer_id FK
        decimal total_amount
        string status
        timestamp placed_at
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    PRODUCT {
        uuid id PK
        uuid category_id FK
        string sku UK
        string name
        decimal price
        int stock_count
    }`
  },
  {
    id: 'order_lifecycle',
    title: 'Order Processing State Machine',
    category: 'state',
    description: 'Complete lifecycle states from Draft to Delivered or Refunded',
    code: `stateDiagram-v2
    [*] --> Draft : Customer adds items
    Draft --> PendingPayment : Checkout submitted
    PendingPayment --> PaymentFailed : Card declined
    PaymentFailed --> PendingPayment : Retry payment
    PaymentFailed --> Cancelled : Timeout (24h)
    PendingPayment --> Processing : Payment confirmed

    state Processing {
        [*] --> Packing
        Packing --> QualityCheck
        QualityCheck --> ReadyForDispatch
    }

    Processing --> Shipped : Handed to carrier
    Shipped --> OutForDelivery : Local hub arrival
    OutForDelivery --> Delivered : Customer signed
    Delivered --> ReturnRequested : Within 14 days
    ReturnRequested --> Refunded : Item inspected & approved
    Delivered --> [*] : Closed
    Cancelled --> [*] : Closed
    Refunded --> [*] : Closed`
  },
  {
    id: 'git_workflow',
    title: 'Git Feature Branching Workflow',
    category: 'gitGraph',
    description: 'Git flow with feature branches, hotfix, and release tags',
    code: `gitGraph
    commit id: "Initial commit"
    commit id: "Add project setup"
    branch develop
    checkout develop
    commit id: "Feature: core engine"
    branch feature/mermaid-parser
    checkout feature/mermaid-parser
    commit id: "Implement AST tokenization"
    commit id: "Support edge & node parsing"
    checkout develop
    merge feature/mermaid-parser
    branch release/v1.0.0
    checkout release/v1.0.0
    commit id: "Bump version to 1.0.0"
    checkout main
    merge release/v1.0.0 tag: "v1.0.0"
    checkout develop
    merge release/v1.0.0
    commit id: "Next iteration setup"`
  },
  {
    id: 'market_pie',
    title: 'Cloud Infrastructure Market Share',
    category: 'pie',
    description: 'Pie chart representation of global cloud provider shares',
    code: `pie title Global Cloud Infrastructure Provider Share (2025)
    "Amazon Web Services (AWS)" : 31.5
    "Microsoft Azure" : 24.8
    "Google Cloud Platform (GCP)" : 11.2
    "Alibaba Cloud" : 4.6
    "Oracle Cloud (OCI)" : 3.2
    "Other Specialized Providers" : 24.7`
  },
  {
    id: 'class_architecture',
    title: 'Domain Model Class Diagram',
    category: 'class',
    description: 'Object-oriented domain model with interfaces, inheritance, and methods',
    code: `classDiagram
    class PaymentProcessor {
        <<interface>>
        +processPayment(amount: Float) Boolean
        +refund(transactionId: String) Boolean
    }

    class StripeProcessor {
        -apiKey: String
        -webhookSecret: String
        +processPayment(amount: Float) Boolean
        +refund(transactionId: String) Boolean
        +createSetupIntent() String
    }

    class PayPalProcessor {
        -clientId: String
        -clientSecret: String
        +processPayment(amount: Float) Boolean
        +refund(transactionId: String) Boolean
    }

    class PaymentManager {
        -processor: PaymentProcessor
        +setProcessor(processor: PaymentProcessor) void
        +checkout(order: Order) Receipt
    }

    PaymentProcessor <|.. StripeProcessor
    PaymentProcessor <|.. PayPalProcessor
    PaymentManager --> PaymentProcessor`
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXAMPLES;
}
