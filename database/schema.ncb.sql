-- =====================================================
-- Multi-Business Invoice Management System
-- NoCodeBackend / MariaDB schema -- REFERENCE COPY
-- =====================================================
-- The live database (36905_invg) was NOT created from this file. It was
-- created with the NCB MCP `create_database` tool, which also provisions the
-- ncba_* auth tables and infers foreign keys automatically. This file records
-- the equivalent DDL for reference and for rebuilding elsewhere.
--
-- Differences between this file and the live database:
--   * `users` is named `app_users` live -- `users` would collide with NCB's
--     own `ncba_user` auth table.
--   * NCB adds a `user_id` VARCHAR column to every table, FK -> ncba_user.id,
--     used for row-level security. Unused while the app has no end-user login.
--   * `created_by` is a VARCHAR FK -> ncba_user.id live, NOT an app_users id.
--     The app leaves it NULL.
--   * created_at / updated_at were added afterwards via `execute_sql`.
--
-- Order matters: parents before children (FK constraints).

CREATE TABLE businesses (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    name                  VARCHAR(255) NOT NULL,
    address               VARCHAR(255),
    city                  VARCHAR(100),
    state                 VARCHAR(50),
    zip                   VARCHAR(20),
    country               VARCHAR(100) DEFAULT 'USA',
    email                 VARCHAR(255),
    phone                 VARCHAR(50),
    website               VARCHAR(255),
    logo_url              TEXT,
    tax_number            VARCHAR(100),

    -- Invoice settings per business
    invoice_prefix        VARCHAR(20)  DEFAULT 'INV',
    next_invoice_number   INT          DEFAULT 1,
    po_prefix             VARCHAR(20)  DEFAULT 'PO',
    next_po_number        INT          DEFAULT 1,

    -- Financial settings
    default_payment_terms VARCHAR(100) DEFAULT 'Net 30',
    default_tax_rate      DECIMAL(5,2) DEFAULT 0,
    currency              VARCHAR(3)   DEFAULT 'USD',

    is_active             TINYINT(1)   DEFAULT 1,
    created_at            DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_businesses_active (is_active),
    INDEX idx_businesses_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    full_name  VARCHAR(255),
    role       VARCHAR(50)  DEFAULT 'user',   -- admin, manager, user
    is_active  TINYINT(1)   DEFAULT 1,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE business_users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT,
    user_id     INT,
    role        VARCHAR(50) DEFAULT 'viewer', -- owner, admin, editor, viewer
    is_default  TINYINT(1)  DEFAULT 0,
    created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_business_user (business_id, user_id),
    INDEX idx_business_users_user (user_id),
    CONSTRAINT fk_bu_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bu_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customers (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    business_id   INT,
    name          VARCHAR(255) NOT NULL,
    company       VARCHAR(255),
    address       VARCHAR(255),
    city          VARCHAR(100),
    state         VARCHAR(50),
    zip           VARCHAR(20),
    country       VARCHAR(100),
    email         VARCHAR(255),
    phone         VARCHAR(50),
    notes         TEXT,

    credit_limit  DECIMAL(12,2),
    payment_terms VARCHAR(100),

    is_active     TINYINT(1) DEFAULT 1,
    created_at    DATETIME   DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by    INT,

    INDEX idx_customers_business (business_id),
    INDEX idx_customers_active (business_id, is_active),
    INDEX idx_customers_email (email),
    CONSTRAINT fk_cust_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_cust_creator  FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoices (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    business_id     INT,
    customer_id     INT,

    invoice_number  VARCHAR(50) NOT NULL,
    invoice_date    DATE NOT NULL,
    due_date        DATE,
    payment_terms   VARCHAR(100),

    -- draft, sent, viewed, partially_paid, paid, overdue, cancelled
    status          VARCHAR(50) DEFAULT 'draft',
    sent_date       DATETIME,
    viewed_date     DATETIME,
    paid_date       DATETIME,

    subtotal        DECIMAL(12,2) DEFAULT 0,
    tax_rate        DECIMAL(5,2)  DEFAULT 0,
    tax_amount      DECIMAL(12,2) DEFAULT 0,
    discount_rate   DECIMAL(5,2)  DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount    DECIMAL(12,2) DEFAULT 0,
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    balance_due     DECIMAL(12,2) DEFAULT 0,

    po_number       VARCHAR(50),
    notes           TEXT,
    internal_notes  TEXT,

    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      INT,

    UNIQUE KEY uq_invoice_number (business_id, invoice_number),
    INDEX idx_invoices_business (business_id),
    INDEX idx_invoices_customer (customer_id),
    INDEX idx_invoices_status (business_id, status),
    INDEX idx_invoices_date (invoice_date),
    INDEX idx_invoices_due (due_date),
    CONSTRAINT fk_inv_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id)  ON DELETE SET NULL,
    CONSTRAINT fk_inv_creator  FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoice_items (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id   INT,

    description  TEXT NOT NULL,
    service_date DATE,
    quantity     DECIMAL(10,2) DEFAULT 1,
    rate         DECIMAL(12,2) DEFAULT 0,
    amount       DECIMAL(12,2) DEFAULT 0,

    tax_rate     DECIMAL(5,2),
    tax_amount   DECIMAL(12,2),

    sort_order   INT      DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_invoice_items_invoice (invoice_id),
    CONSTRAINT fk_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id       INT,

    payment_date     DATE NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    payment_method   VARCHAR(50),   -- check, credit_card, bank_transfer, cash, other
    reference_number VARCHAR(100),  -- check number, transaction ID, etc.
    notes            TEXT,

    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by       INT,

    INDEX idx_payments_invoice (invoice_id),
    INDEX idx_payments_date (payment_date),
    CONSTRAINT fk_pay_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_creator FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchase_orders (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    business_id       INT,
    customer_id       INT,

    po_number         VARCHAR(50) NOT NULL,
    po_date           DATE NOT NULL,
    expected_delivery DATE,

    status            VARCHAR(50) DEFAULT 'pending', -- pending, approved, fulfilled, cancelled

    subtotal          DECIMAL(12,2) DEFAULT 0,
    tax_amount        DECIMAL(12,2) DEFAULT 0,
    total_amount      DECIMAL(12,2) DEFAULT 0,

    notes             TEXT,
    terms_conditions  TEXT,

    invoice_id        INT,  -- set once converted to an invoice

    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by        INT,

    UNIQUE KEY uq_po_number (business_id, po_number),
    INDEX idx_po_business (business_id),
    INDEX idx_po_customer (customer_id),
    INDEX idx_po_status (business_id, status),
    CONSTRAINT fk_po_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_po_customer FOREIGN KEY (customer_id) REFERENCES customers(id)  ON DELETE SET NULL,
    CONSTRAINT fk_po_invoice  FOREIGN KEY (invoice_id)  REFERENCES invoices(id)   ON DELETE SET NULL,
    CONSTRAINT fk_po_creator  FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE po_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    po_id       INT,

    description TEXT NOT NULL,
    quantity    DECIMAL(10,2) DEFAULT 1,
    rate        DECIMAL(12,2) DEFAULT 0,
    amount      DECIMAL(12,2) DEFAULT 0,

    sort_order  INT      DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_po_items_po (po_id),
    CONSTRAINT fk_poitem_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_log (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id      INT,

    recipient_email VARCHAR(255) NOT NULL,
    subject         VARCHAR(500),
    status          VARCHAR(50),  -- queued, sent, delivered, opened, bounced, failed

    sent_at         DATETIME,
    delivered_at    DATETIME,
    opened_at       DATETIME,
    open_count      INT DEFAULT 0,

    error_message   TEXT,

    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_by         INT,

    INDEX idx_email_log_invoice (invoice_id),
    CONSTRAINT fk_email_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_email_sender  FOREIGN KEY (sent_by)    REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoice_templates (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    business_id    INT,

    name           VARCHAR(255) NOT NULL,
    description    TEXT,

    payment_terms  VARCHAR(100),
    tax_rate       DECIMAL(5,2),
    discount_rate  DECIMAL(5,2),
    notes          TEXT,

    template_items JSON,

    is_active      TINYINT(1) DEFAULT 1,
    created_at     DATETIME   DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by     INT,

    INDEX idx_templates_business (business_id),
    CONSTRAINT fk_tpl_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_tpl_creator  FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
