-- ============================================================
-- MPG Finance v2 — Database Master Only
-- Generated: 2026-06-08 10:45:14
-- Contains: Structure (all tables) + Master data only
-- Transaction tables: structure only, no data
-- Numbering sequences: reset to 1
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `accounting_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','closed','locked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `is_fiscal_year` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `period_code` (`period_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `accounting_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transaction_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `debit_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rule_code` (`rule_code`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `accounts_payable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts_payable` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ap_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `outstanding_amount` decimal(15,2) NOT NULL,
  `status` enum('unpaid','paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `po_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ap_code` (`ap_code`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `accounts_receivable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts_receivable` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ar_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `outstanding_amount` decimal(15,2) NOT NULL,
  `status` enum('unpaid','partial','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ar_code` (`ar_code`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `audit_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audit_code` (`audit_code`)
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_holder` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'IDR',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_code` (`account_code`),
  UNIQUE KEY `account_number` (`account_number`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bank_reconciliations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_reconciliations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reconciliation_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `statement_date` date NOT NULL,
  `ending_balance` decimal(15,2) NOT NULL,
  `reconciled_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reconciled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('draft','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reconciliation_code` (`reconciliation_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ca_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ca_settlements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settlement_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ca_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_ca_amount` decimal(15,2) NOT NULL,
  `total_used_amount` decimal(15,2) NOT NULL,
  `remaining_amount` decimal(15,2) NOT NULL,
  `refund_proof_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refund_proof_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settlement_date` date NOT NULL,
  `status` enum('submitted','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settlement_code` (`settlement_code`),
  UNIQUE KEY `ca_code` (`ca_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ca_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ca_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ca_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `receipt_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cash_advances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_advances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ca_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `used_amount` decimal(15,2) DEFAULT '0.00',
  `remaining_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('submitted','approved','rejected','active','in_settlement','completed','partially_used','fully_used','draft') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `request_date` date NOT NULL,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `submitted_date` datetime DEFAULT NULL,
  `submitted_time` datetime DEFAULT NULL,
  `journal_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accounting_status` enum('not_posted','posted','reconciled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'not_posted',
  `assigned_to` varbinary(55) DEFAULT NULL,
  `company_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payment_proof_path` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ca_code` (`ca_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chart_of_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_company_account` (`company_code`,`account_code`),
  KEY `idx_parent` (`parent_account_code`),
  KEY `idx_company` (`company_code`),
  KEY `idx_account_type` (`account_type`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `industry` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Indonesia',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_code` (`company_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('transfer','cash','credit_card','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_proof` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','paid','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'paid',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_type` enum('individual','company','government') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'company',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `shipping_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tax_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `payment_terms` int DEFAULT '30',
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `delivery_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `do_code` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_item_code` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `po_item_code` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(15,2) NOT NULL COMMENT 'Harga jual dari SO',
  `purchase_price` decimal(15,2) NOT NULL COMMENT 'Harga beli dari PO (copy)',
  `subtotal` decimal(15,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  `cogs_amount` decimal(15,2) GENERATED ALWAYS AS ((`quantity` * `purchase_price`)) STORED,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_do_code` (`do_code`),
  KEY `idx_so_item_code` (`so_item_code`),
  KEY `idx_po_item_code` (`po_item_code`),
  KEY `idx_product_code` (`product_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `delivery_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `do_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_order_codes` json DEFAULT NULL,
  `courier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_date` date DEFAULT NULL,
  `shipping_cost` decimal(15,2) DEFAULT '0.00',
  `shipping_proof` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('shipping','delivered') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'shipping',
  `proof_of_delivery` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `received_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmation_method` enum('whatsapp','email','call','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `ar_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiver_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivered_date` date DEFAULT NULL,
  `delivered_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `do_code` (`do_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `delivery_orders_backup_20260528`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_orders_backup_20260528` (
  `id` int NOT NULL DEFAULT '0',
  `do_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_order_codes` json DEFAULT NULL,
  `courier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_date` date DEFAULT NULL,
  `shipping_cost` decimal(15,2) DEFAULT '0.00',
  `shipping_proof` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('shipping','delivered') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'shipping',
  `proof_of_delivery` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `received_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmation_method` enum('whatsapp','email','call','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `ar_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiver_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `financial_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_type` enum('balance_sheet','income_statement','cash_flow','trial_balance') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `statement_data` json NOT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_code` (`report_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `journal_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `journal_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `period_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_debit` decimal(15,2) NOT NULL,
  `total_credit` decimal(15,2) NOT NULL,
  `status` enum('draft','posted','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `posted_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `posted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `journal_code` (`journal_code`),
  KEY `idx_journal_entries_period_date` (`period_code`,`transaction_date`),
  KEY `idx_journal_period_date` (`period_code`,`transaction_date`),
  KEY `idx_je_company` (`company_code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `journal_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `journal_item_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `journal_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `debit_amount` decimal(15,2) DEFAULT '0.00',
  `credit_amount` decimal(15,2) DEFAULT '0.00',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `journal_item_code` (`journal_item_code`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `numbering_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `numbering_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sequence_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `next_number` int DEFAULT '1',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sequence_code` (`sequence_code`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_allocations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ar_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_code` (`payment_code`),
  KEY `idx_ar_code` (`ar_code`),
  CONSTRAINT `payment_allocations_ibfk_1` FOREIGN KEY (`payment_code`) REFERENCES `payments` (`payment_code`) ON DELETE CASCADE,
  CONSTRAINT `payment_allocations_ibfk_2` FOREIGN KEY (`ar_code`) REFERENCES `accounts_receivable` (`ar_code`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_code` (`payment_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','completed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'completed',
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  KEY `idx_payment_code` (`payment_code`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` enum('transactions','cash_advance','reimburse','projects','settings','reports','delivery','accounting') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('create','view','update','delete','approve','approve_spv','approve_finance','pay','reconcile','manage','post_journal','close_period') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_code` (`permission_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `po_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attachment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` enum('po','payment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint DEFAULT '0',
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(15,0) DEFAULT '0',
  `cost_price` decimal(15,0) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `unit_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_code` (`product_code`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `client_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `status` enum('active','completed','on_hold','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `purchase_order_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_doc_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('invoice','proof') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'proof',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_doc_code` (`payment_doc_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_item_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `po_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_data` json DEFAULT NULL,
  `quantity` int NOT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_price` decimal(15,2) NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expired_date` date DEFAULT NULL,
  `lot_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_item_code` (`po_item_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `purchase_order_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `po_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `po_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('transfer','cash','credit_card','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','paid','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `tax_configuration` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'percentage',
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approved_by_spv` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_finance` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_code` (`po_code`),
  KEY `idx_purchase_orders_status_date` (`status`,`created_at`),
  KEY `idx_po_status_date` (`status`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recurring_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recurring_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` enum('monthly','quarterly','yearly') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `next_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `debit_account` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_account` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entry_code` (`entry_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reimbursement_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reimbursement_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reimbursement_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reimbursement_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reimbursement_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `attachment_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_code` (`item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reimbursements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reimbursements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reimbursement_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_by_user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `status` enum('submitted','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `payment_proof_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_date` date DEFAULT NULL,
  `submitted_time` time DEFAULT NULL,
  `approved_by_user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_date` timestamp NULL DEFAULT NULL,
  `bank_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `journal_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accounting_status` enum('not_posted','posted','reconciled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'not_posted',
  `bank_accounts_code` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `supporting_documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `company_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reimbursement_code` (`reimbursement_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_code` (`role_permission_code`),
  UNIQUE KEY `unique_role_permission` (`role_code`,`permission_code`)
) ENGINE=InnoDB AUTO_INCREMENT=405 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_system_role` tinyint(1) DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_code` (`role_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales_order_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attachment_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attachment_code` (`attachment_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_item_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_data` json DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `unit_price` decimal(15,2) NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_item_code` (`so_item_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales_order_taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_taxes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_tax_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_rate` decimal(10,2) NOT NULL,
  `tax_amount` decimal(15,2) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_tax_code` (`so_tax_code`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sales_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(15,0) DEFAULT '0',
  `tax_amount` decimal(15,0) DEFAULT '0',
  `status` enum('submitted','processing','ready_to_invoice','invoicing','delivered','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_configuration` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'included',
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_code` (`so_code`),
  KEY `idx_sales_orders_status_date` (`status`,`created_at`),
  KEY `idx_so_status_date` (`status`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tax_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_terms` int DEFAULT '30',
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_code` (`supplier_code`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tax_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tax_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tax_rate` decimal(5,2) NOT NULL,
  `tax_type` enum('vat','pph','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_code` (`tax_code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transaction_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_code` (`type_code`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trial_balance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trial_balance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `opening_debit` decimal(15,2) DEFAULT '0.00',
  `opening_credit` decimal(15,2) DEFAULT '0.00',
  `transaction_debit` decimal(15,2) DEFAULT '0.00',
  `transaction_credit` decimal(15,2) DEFAULT '0.00',
  `closing_debit` decimal(15,2) DEFAULT '0.00',
  `closing_credit` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_period` (`period_code`,`account_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `audit_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('create','update','delete','assign','revoke','approve','reject','pay','reconcile') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audit_code` (`audit_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_role_code` (`user_role_code`),
  UNIQUE KEY `unique_user_role` (`user_code`,`role_code`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_code` (`user_code`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


-- ============================================================
-- MASTER DATA
-- ============================================================


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chart_of_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_company_account` (`company_code`,`account_code`),
  KEY `idx_parent` (`parent_account_code`),
  KEY `idx_company` (`company_code`),
  KEY `idx_account_type` (`account_type`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `chart_of_accounts` WRITE;
/*!40000 ALTER TABLE `chart_of_accounts` DISABLE KEYS */;
INSERT INTO `chart_of_accounts` VALUES (1,'10000','Assets','asset',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(2,'11000','Aktiva Lancar','asset','10000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(3,'11100','Kas dan Setara Kas','asset','11000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(4,'20000-00','AP Trade (Header)','liability',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(5,'30000-00','Equity','equity',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(6,'40010-00','Revenue (Header)','revenue',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(7,'50000-00','Cost of sales (Header)','expense',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(8,'60000-00','Beban Administrasi Umum (Header)','expense',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(9,'79050-00','Others Expenses','expense',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(10,'80000-00','Others Income (Header)','revenue',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(11,'10010-00','Kas Pusat','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(12,'10011-00','Kas Operasional Kantor','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(13,'10020-00','Bank MPG Giro BCA XXXX-XXX-XXX','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(14,'10030-00','Bank MPG Giro Mandiri XXXX-XXX-XXX','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(15,'10040-00','Bank MPG Tab Mandiri XXXX-XXX-XXX','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(16,'10050-00','Bank MPG Giro BJB XXXX-XXX-XXX','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(17,'10900-00','Clearing Account / Overbooking','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(18,'11000-00','AR Trade (Header)','asset','11000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(19,'11101-00','Piutang Usaha','asset','11000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(20,'11110','Kas Kecil','asset','11100',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(21,'12000-00','Other Receivable','asset','11000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(22,'12001-00','Piutang Karyawan','asset','12000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(23,'12002-00','Piutang Lain-Lain','asset','12000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(24,'12100-00','Piutang Direksi','asset','12000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(25,'13000-00','Persediaan','asset','10000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(26,'13001-00','Persediaan Barang Di Site','asset','13000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(27,'13002-00','Persediaan Barang Konsumsi Kantor','asset','13000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(28,'14000-00','Biaya dibayar dimuka (Header)','asset','10000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(29,'14001-00','Sewa dibayar dimuka','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(30,'14002-00','Uang Muka Pembelian','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(31,'14003-00','Uang Muka Project','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(32,'14100-00','Uang Muka Pajak - PPh 22','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(33,'14200-00','Uang Muka Pajak - PPh 23','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(34,'14300-00','Uang Muka Pajak - PPh 25','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(35,'14400-00','Uang Muka Pajak - PPh 21','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(36,'14500-00','Uang Muka Pajak - PPN Masukan','asset','14000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(37,'15000-00','Fixed Asset','asset','10000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(38,'15100-00','Tanah','asset','15000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(39,'15200-00','Bangunan','asset','15000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(40,'15300-00','Kendaraan','asset','15000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(41,'15400-00','Inventaris Kantor','asset','15000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(42,'15500-00','Perlengkapan Kantor','asset','15000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(43,'16000-00','Accumulated Depreciation (Header)','asset','15000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(44,'16200-00','AK Penyusutan Bangunan','asset','16000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(45,'16300-00','AK Penyusutan Kendaraan','asset','16000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(46,'16400-00','AK Penyusutan Inventaris','asset','16000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(47,'16500-00','AK Penyusutan Perlengkapan','asset','16000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(48,'19000-00','Others Assets','asset','10000',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(49,'19010-00','Investment','asset','19000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(50,'19020-00','Deposit','asset','19000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(51,'20101-00','Hutang Usaha','liability','20000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(52,'20200-00','Hutang kepada Pemegang Saham','liability','20000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(53,'20510-00','Customer Deposit','liability','20000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(54,'20520-00','Hutang lain lain','liability','20000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(55,'21500-00','Hutang Bank','liability','20000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(56,'22000-00','AP Tax (Header)','liability','20000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(57,'22101-00','Hutang PPN','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(58,'22102-00','WHT Payable Art 21','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(59,'22103-00','WHT Payable Art 23','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(60,'22104-00','WHT Payable Art 4 Parg 2','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(61,'22105-00','WHT Payable Final Income Tax','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(62,'22106-00','WHT Payable Art 26','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(63,'22107-00','WHT Payable Art 25','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(64,'22108-00','WHT Payable Art 29','liability','22000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(65,'23000-00','Accruals','liability',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(66,'23001-00','Accrued Gaji','liability','23000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(67,'23002-00','Accrued Listrik','liability','23000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(68,'90010-00','Provision for Income Tax','liability',NULL,NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(69,'30010-00','Setoran Modal Romy Syaf Putra','equity','30000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(70,'30020-00','Setoran Modal Harun Alrasyid','equity','30000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(71,'32000-00','Dividen Paid','equity','30000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(72,'35000-00','Retained Earning','equity','30000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(73,'40020-00','Sales Project','revenue','40010-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(74,'40030-00','Pendapatan Jasa','revenue','40010-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(75,'40040-00','Pendapatan Alkes','revenue','40010-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(76,'45100-00','Sales discount','revenue','40010-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(77,'80010-00','Interest Income Deposit','revenue','80000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(78,'80020-00','Interest Expenses','revenue','80000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(79,'80030-00','Pendapatan lain-lain','revenue','80000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(80,'85010-00','PL Forex','revenue','80000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(81,'85020-00','PL of Disposal FA','revenue','80000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(82,'85025-00','Tax Penalty','revenue','80000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(83,'85040-00','Rounding','revenue','80000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(84,'50100-00','Pembelian','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(85,'50200-00','Ongkos Angkut Pembelian','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(86,'50300-00','Jasa Teknik','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(87,'50400-00','Perjalanan Dinas','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(88,'50500-00','Makan Project','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(89,'50600-00','Transport Project','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(90,'50700-00','Entertaint','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(91,'50800-00','Sparepart','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(92,'50900-00','Ongkos Kirim','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(93,'51000-00','Biaya Marketing','expense','50000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(94,'60010-00','Salary','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(95,'60020-00','Bonus & THR','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(96,'60030-00','Overtime','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(97,'60040-00','Makan Kantor','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(98,'60050-00','Asuransi','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(99,'60060-00','Tunjangan PPh 21','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(100,'61000-00','Office Expenses','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(101,'61010-00','Listrik','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(102,'61020-00','Telephone and internet','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(103,'61030-00','ATK dan Printing','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(104,'61035-00','Pos & Meterai','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(105,'61040-00','Perjalanan Dinas (Office)','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(106,'61050-00','Service Mobil','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(107,'61060-00','Perlengkapan Kantor','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(108,'61070-00','Beban Perizinan & Lisensi','expense','61000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(109,'62000-00','Biaya Sewa','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(110,'62010-00','Beban Pelatihan Karyawan','expense','62000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(111,'62020-00','Transport','expense','62000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(112,'62030-00','beban profesional fee','expense','62000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(113,'62040-00','Donation','expense','62000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(114,'63000-00','Entertainment','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(115,'63010-00','Repair & Maintenance','expense','63000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(116,'63020-00','Catering','expense','63000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(117,'63030-00','Biaya lain-lain','expense','63000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(118,'64000-00','Depreciation Expenses','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(119,'64010-00','Depresiasi Bangunan','expense','64000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(120,'64020-00','Depresiasi Kendaraan','expense','64000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(121,'64030-00','Depresiasi Inventaris','expense','64000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(122,'64040-00','Depresiasi Perlengkapan','expense','64000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(123,'69000-00','Marketing','expense','60000-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(124,'79060-00','Licences','expense','79050-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(125,'79070-00','Manajemen Fee','expense','79050-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(126,'79080-00','Bank Charges','expense','79050-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(127,'79090-00','Beban lain-lain','expense','79050-00',NULL,NULL,1,'2026-05-27 15:18:40','2026-05-28 01:25:47'),(130,'1150','Piutang Intercompany','asset','11101-00',NULL,NULL,1,'2026-05-28 01:36:41','2026-05-28 01:36:41'),(131,'2150','Hutang Intercompany','liability','20101-00',NULL,NULL,1,'2026-05-28 01:36:41','2026-05-28 01:36:41'),(142,'50101-00','Harga Pokok Penjualan','expense','50000-00',NULL,NULL,1,'2026-05-28 03:19:07','2026-05-28 03:19:07');
/*!40000 ALTER TABLE `chart_of_accounts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `accounting_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transaction_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `debit_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rule_code` (`rule_code`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `accounting_rules` WRITE;
/*!40000 ALTER TABLE `accounting_rules` DISABLE KEYS */;
INSERT INTO `accounting_rules` VALUES (1,'RULE001','Penjualan Kredit',NULL,'sale','11101-00','40020-00','22101-00',NULL,1,'2025-10-29 16:34:36','2026-05-27 15:31:42'),(2,'RULE002','Pembelian Kredit',NULL,'purchase','13000-00','20101-00','14500-00',NULL,1,'2025-10-29 16:34:36','2026-05-28 04:21:25'),(3,'RULE003','Penerimaan Kas',NULL,'payment_in','10020-00','11101-00',NULL,NULL,1,'2025-10-29 16:34:36','2026-05-27 15:18:40'),(4,'RULE004','Pengeluaran Kas',NULL,'payment_out','20101-00','10020-00',NULL,NULL,1,'2025-10-29 16:34:36','2026-05-27 15:18:40'),(5,'RULE005','Cash Advance',NULL,'cash_advance','12001-00','10020-00',NULL,NULL,1,'2025-10-29 16:34:36','2026-05-27 15:34:17'),(6,'RULE006','Reimbursement',NULL,'reimbursement','60010-00','10020-00',NULL,NULL,1,'2025-10-29 16:34:36','2026-05-27 15:34:17'),(7,'RULE007','Inter-Co Pengirim',NULL,'inter_co_send','1150','10020-00',NULL,NULL,1,'2026-05-27 15:18:00','2026-05-27 16:30:42'),(8,'RULE008','Inter-Co Penerima',NULL,'inter_co_receive','10020-00','2150',NULL,NULL,1,'2026-05-27 15:18:00','2026-05-27 16:30:42'),(9,'RULE009','Harga Pokok Penjualan',NULL,'cogs','50101-00','13000-00',NULL,NULL,1,'2026-05-27 19:02:32','2026-05-28 03:19:07'),(10,'RULE010','Penerimaan Kas Intercompany',NULL,'payment_in_interco','10020-00','2150',NULL,NULL,1,'2026-05-27 23:47:17','2026-05-27 23:47:17'),(11,'RULE011','Piutang Interco',NULL,'ar_to_interco','1150','11101-00',NULL,NULL,1,'2026-05-27 23:47:17','2026-05-27 23:47:17');
/*!40000 ALTER TABLE `accounting_rules` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `accounting_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','closed','locked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `is_fiscal_year` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `period_code` (`period_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `accounting_periods` WRITE;
/*!40000 ALTER TABLE `accounting_periods` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounting_periods` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `industry` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Indonesia',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_code` (`company_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (2,'COMPWE16GP','PT DIVA SINERGI ADIPRADANA',NULL,'PT DIVA SINERGI ADI PRADANA',NULL,'JL WAHID HASYIM NO 27','JAKARTA','','','Indonesia','895327069923','divasinergi@gmail.com','HTTPS://DIVASINERGI.COM','80.890.811.5-028.000','/uploads/company-logos/logo_1767632451762_x53toruux.png',NULL,'active',0,NULL,'2026-01-06 00:00:51','2026-01-08 15:54:23',1),(3,'COMP5K355D','PT Mata Pensil Globalindo',NULL,'',NULL,'Gedung Wahid 27, Jl KH Wahid Hasyim No 27','Kota Adm. Jakarta Pusat','DKI Jakarta','10340','Indonesia','+62 816-849-444','matapensil2019@gmail.com','https://matapensil.com','0032796005048000','/uploads/company-logos/logo_1768886538619_x3uhy6wia.png',NULL,'active',0,NULL,'2026-01-08 15:53:18','2026-01-20 05:22:18',1),(4,'COMPA289QG','PT Sinergi Aero Angkasa',NULL,'',NULL,'Gedung Wahid 27, Jl KH Wahid Hasyim No 27','Kota Adm. Jakarta Pusat','DKI Jakarta','10340','Indonesia','0000000000','sinergiaeroangkasa@gmail.com','https://www.google.com','0650218589015000','/uploads/company-logos/logo_1769092226114_9dt9ijxif.png',NULL,'active',0,NULL,'2026-01-12 09:25:47','2026-01-22 14:30:26',1),(5,'COMP9Y7LEG','PT REVINDO BAHTERA PRIMA',NULL,'',NULL,'','','','','Indonesia','','','','315752121015000','/uploads/company-logos/logo_1769060275734_0n6ffkuya.png',NULL,'active',0,NULL,'2026-01-22 05:37:55','2026-01-22 05:37:55',1),(6,'COMPBFOPL6','PT INFO MEDIA TRANSPORTASI',NULL,'',NULL,'','','','','Indonesia','','','','812078905071000','/uploads/company-logos/logo_1769060355810_uz90wfsg6.png',NULL,'active',0,NULL,'2026-01-22 05:39:15','2026-01-22 05:39:15',1),(7,'COMPP2T977','PT TRIDIA MEGATARA MAKMUR',NULL,'',NULL,'Ruko Sentul Alaya No.HPCC 53, Hambalang, Kec. Citeureup, Kabupaten Bogor, Jawa Barat 16810','Kota Adm. Jakarta Pusat','DKI Jakarta','10340','Indonesia','0000000000','gatau@gmail.com','https://www.google.com','000000000000000',NULL,NULL,'active',0,NULL,'2026-03-04 03:50:42','2026-03-04 03:50:42',1);
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_holder` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'IDR',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_code` (`account_code`),
  UNIQUE KEY `account_number` (`account_number`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
INSERT INTO `bank_accounts` VALUES (4,'BNK350','BCA','4788883330','PT MATA PENSIL GLOBALINDO ','COMP5K355D','','IDR','BCA Payment Supplier',1,0,NULL,'2026-01-08 17:07:27','2026-05-27 16:22:47'),(5,'BNK153','MANDIRI','155007900077','PT MATA PENSIL GLOBALINDO ','COMP5K355D','','IDR','petty cash',1,0,NULL,'2026-01-22 05:28:56','2026-05-27 16:24:45'),(6,'MAN683','MANDIRI','103000657900','PT MATA PENSIL GLOBALINDO','COMP5K355D','','IDR','',1,0,NULL,'2026-01-22 05:29:31','2026-05-27 16:24:45'),(7,'MAN028','BJB ','0143886727001','PT MATA PENSIL GLOBALINDO','COMP5K355D','','IDR','Penerimaan Alkes',1,0,NULL,'2026-01-22 05:30:42','2026-05-27 16:24:45'),(8,'BJB184','BRI','4410100249230','PT MATA PENSIL GLOBALINDO ','COMP5K355D','','IDR','',1,0,NULL,'2026-01-22 05:32:36','2026-05-27 16:24:45'),(9,'BNK808','Bank Banten','0327960050480','PT MATA PENSIL GLOBALINDO','COMP5K355D','','IDR','',1,0,NULL,'2026-01-22 05:33:02','2026-05-27 16:24:45'),(10,'BAN030','BNI','2395119603','PT DIVA SINERGI ADIPRADANA','COMPWE16GP','','IDR','',1,0,NULL,'2026-01-22 05:33:25','2026-05-27 16:24:45'),(11,'BNI146','BJB','0146897355001','PT DIVA SINERGI ADIPRADANA','COMPWE16GP','','IDR','',1,0,NULL,'2026-01-22 05:33:47','2026-05-27 16:24:45'),(12,'BJB389','BCA','4780444466','PT INFO MEDIA TRANSPORTASI','COMPBFOPL6','','IDR','',1,0,NULL,'2026-01-22 05:34:08','2026-05-27 16:24:45'),(13,'BCA170','MANDIRI','103002000040','PT SINERGI AERO ANGKASA','COMPA289QG','','IDR','',1,0,NULL,'2026-01-22 05:34:30','2026-05-27 16:24:45'),(14,'BNK926','BCA','4788882244','PT REVINDO BAHTERA PRIMA','COMP9Y7LEG','','IDR','',1,0,NULL,'2026-01-22 05:34:47','2026-05-27 16:24:45'),(15,'BNK402','BCA','43601355511','PT MATA PENSIL GLOBALINDO','COMP5K355D','','IDR','',1,1,'2026-01-28 09:26:51','2026-01-28 09:25:38','2026-05-27 16:24:45'),(16,'BNK620','bank','4360135611111111','MANDIRI ME',NULL,'','IDR','desc',1,1,'2026-01-28 15:58:46','2026-01-28 15:58:40','2026-01-28 15:58:46');
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_type` enum('individual','company','government') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'company',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `shipping_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tax_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `payment_terms` int DEFAULT '30',
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (3,'CUST76OP','PT ANGKASA','individual','02199953255','symphoi52@gmail.com','JL WAHID HASYIM','JL WAHID HASYIM','12.1231.123123',5000.00,30,'active',0,NULL,'2026-01-06 00:05:05','2026-01-06 00:05:05'),(4,'CUSTY3PG','Puskesmas Cangkurawok','company','087879252171','pkm.cangkurawok@gmail.com','Jl. Raya Cikarawang Rt 04 Rw 06 Desa Cikarawang, Dramaga','l. Raya Cikarawang Rt 04 Rw 06 Desa Cikarawang, Dramaga','00.136.890.1-403.000',0.00,30,'active',0,NULL,'2026-01-08 15:56:20','2026-01-22 03:06:29'),(5,'CUSTY822','Puskesmas Ciasmara','company','085814446808','puskesmasciasmara0505@gmail.com','Jl. Raya KH Abd. Hamid km 15, Kp. Parabakti Pasar RT.001/RW.007 Desa Ciasmara Kecamatan Pamijahan Kabupaten Bogor','Jl. Raya KH Abd. Hamid km 15, Kp. Parabakti Pasar RT.001/RW.007 Desa Ciasmara Kecamatan Pamijahan Kabupaten Bogor','0001368901403000',0.00,30,'active',0,NULL,'2026-01-12 08:42:18','2026-01-22 03:01:20'),(6,'CUST96ZR','RSUD Pasar Minggu ','government','(021) 29059999','rsudpasarminggu@jakarta.go.id','Jl. TB Simatupang No.1, RT.9/RW.4, Ragunan, Ps. Minggu, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12550','Jl. TB Simatupang No.1, RT.9/RW.4, Ragunan, Ps. Minggu, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12550','',0.00,30,'active',0,NULL,'2026-01-14 05:07:32','2026-01-19 09:25:44'),(7,'CUSTGARL','RS PUSAT PERTAMINA','company','0812-9515-5863','rsppcustomercare@ihc.id','Jalan Kyai Maja No. 43, Kebayoran Baru, Jakarta Selatan, DKI Jakarta 12120','Jalan Kyai Maja No. 43, Kebayoran Baru, Jakarta Selatan, DKI Jakarta 12120','',0.00,30,'active',0,NULL,'2026-01-15 04:28:01','2026-01-22 02:21:02'),(8,'CUSTALBU','PKM Cibeutung Udik','company','08111925443','cibeuteungudik@gmail.com','Jl. Cihideung Girang Rt 003 Rw 009, Desa Cihideung Udik, Kecamatan Ciampea, Kabupaten Bogor, Jawa Barat,','Jl. Cihideung Girang Rt 003 Rw 009, Desa Cihideung Udik, Kecamatan Ciampea, Kabupaten Bogor, Jawa Barat,','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 06:53:01','2026-01-22 05:51:12'),(9,'CUSTT8EL','RSUD Ciawi','company','(0251) 8240797','rsudciawi.upbj@gmail.com','Jalan Raya Puncak No. 479, Ciawi, Bogor, Jawa Barat, 16720','Jalan Raya Puncak No. 479, Ciawi, Bogor, Jawa Barat, 16720','',0.00,30,'active',0,NULL,'2026-01-19 07:21:20','2026-02-10 06:26:17'),(10,'CUST6G54','RS Islam Cempaka Putih','company','(021) 42801567','rsijpusat@rsi.co.id','Jalan Cempaka Putih Tengah I No. 1, Cempaka Putih Timur, Jakarta Pusat, DKI Jakarta','Jalan Cempaka Putih Tengah I No. 1, Cempaka Putih Timur, Jakarta Pusat, DKI Jakarta','13611140073000',0.00,30,'active',0,NULL,'2026-01-19 07:22:52','2026-01-20 06:46:34'),(11,'CUSTV2HP','RSUD Adjidarmo','company','082122300839','rsudadjidarmo@yahoo.co.id','Jl Iko Jatmiko No. 1 Rangkasbitung Kabupaten Lebak Banten','Jl Iko Jatmiko No. 1 Rangkasbitung Kabupaten Lebak Banten','3217593419000',0.00,30,'active',0,NULL,'2026-01-19 07:25:28','2026-01-20 06:45:16'),(12,'CUSTLBRX','RSUD Malingping','company','(0252) 508194','rsudmalingping@yahoo.com','Jl. Raya Saketi Km 1 Malingping','Jl. Raya Saketi Km 1 Malingping','963613799419000',0.00,30,'active',0,NULL,'2026-01-19 07:27:39','2026-01-20 06:43:09'),(13,'CUSTBO4O','RSUD Cibinong','company','(021) 8753487','rsd_cibinong@yahoo.com','Jl. KSR Dadi Kusmayadi No.27, Tengah, Kecamatan Cibinong, Kabupaten Bogor, Jawa Barat 16914','Jl. KSR Dadi Kusmayadi No.27, Tengah, Kecamatan Cibinong, Kabupaten Bogor, Jawa Barat 16914','656901832403000',0.00,30,'active',0,NULL,'2026-01-19 07:29:07','2026-01-20 06:41:01'),(14,'CUSTFQ5C','Dinas Kesehatan Kabupaten Tasikmalaya','company','(0265) 332723','labkabtsm@gmail.com','','','630922045425000',0.00,30,'active',0,NULL,'2026-01-19 07:31:21','2026-01-19 07:31:21'),(15,'CUSTZDQB','PKM Bojong Gede','company','(021) 8780053','uptpuskesmasbojonggede@gmail.com','Jl. Raya Bojonggede No. 27 Desa Bojonggede Kec. Bojong Gede','Jl. Raya Bojonggede No. 27 Desa Bojonggede Kec. Bojong Ged','324970403000',0.00,30,'active',0,NULL,'2026-01-19 07:33:02','2026-05-15 07:21:18'),(16,'CUSTTH8C','PKM Cimandala ','company','(0251) 8652126','ppuskesmascimandala194@gmail.com','Jalan Raya Jakarta-Bogor KM 51, Cimandala, Kecamatan Sukaraja, Kabupaten Bogor, Jawa Barat 16710','Jalan Raya Jakarta-Bogor KM 51, Cimandala, Kecamatan Sukaraja, Kabupaten Bogor, Jawa Barat 16710','',0.00,30,'active',0,NULL,'2026-01-19 07:35:10','2026-01-20 06:36:06'),(17,'CUSTW376','PKM Cileungsi','company','(021) 8230348','puskesmascileungsi@yahoo.co.id','Jl. Camat Enjan No. 1, Cileungsi, Kabupaten Bogor, Jawa Barat 16820','Jl. Camat Enjan No. 1, Cileungsi, Kabupaten Bogor, Jawa Barat 16820','',0.00,30,'active',0,NULL,'2026-01-19 07:36:46','2026-01-20 06:35:19'),(18,'CUSTC46L','PKM Pasir Angin','company','(021) 82497967','pasirangin92@gmail.com','Jalan Raya Cileungsi - Setu RT 01 RW 01, Desa Pasirangin, Kecamatan Cileungsi, Kabupaten Bogor, Jawa Barat 16820','Jalan Raya Cileungsi - Setu RT 01 RW 01, Desa Pasirangin, Kecamatan Cileungsi, Kabupaten Bogor, Jawa Barat 16820','1368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:37:53','2026-01-20 06:34:36'),(19,'CUST9ZHT','PKM SukaMakmur','company','0856-9131-0930','uptpuskesmassukamakmur@gmail.com','Jl. Sukamakmur No. 02, Kecamatan Sukamakmur, Kabupaten Bogor, Jawa Barat 16830','Jl. Sukamakmur No. 02, Kecamatan Sukamakmur, Kabupaten Bogor, Jawa Barat 16830','',0.00,30,'active',0,NULL,'2026-01-19 07:38:33','2026-05-15 07:17:03'),(20,'CUSTG23M','PKM Ciangsana ','company','(021) 84930448','upfciangsana@gmai.com','Jalan Raya Ciangsana No.3, Desa Ciangsana, Kecamatan Gunung Putri, Kabupaten Bogor, Jawa Barat 16968','Jalan Raya Ciangsana No.3, Desa Ciangsana, Kecamatan Gunung Putri, Kabupaten Bogor, Jawa Barat 16968','',0.00,30,'active',0,NULL,'2026-01-19 07:39:46','2026-01-20 06:32:21'),(21,'CUSTZMKN','PKM Karya Mekar','company','085211295939','upfpuskesmaskaryamekar@gmail.com','Jl. Selawangi, Kp. Pasirpeteuy RT 002/RW 001 Desa Karya Mekar, Kec Cariu , Kab Bogor. 16840','Jl. Selawangi, Kp. Pasirpeteuy RT 002/RW 001 Desa Karya Mekar, Kec Cariu , Kab Bogor. 16840','',0.00,30,'active',0,NULL,'2026-01-19 07:41:41','2026-02-02 06:19:53'),(22,'CUSTLA5J','PKM Cibening','company','085778980791','upfcibening01@gmail.com','Jl. Thamrin No. 1, Kampung Pasir datar, RT. 1 RW 6, Desa Cibening, Kecamatan Pamijahan, Kabupaten Bogor.','Jl. Thamrin No. 1, Kampung Pasir datar, RT. 1 RW 6, Desa Cibening, Kecamatan Pamijahan, Kabupaten Bogor.','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:43:10','2026-01-22 02:53:10'),(23,'CUSTY7UH','PKM Ragajaya','company','081398301505','puskesmas.ragajaya11@gmail.com','Jl. Raya Citayam-Parung, Kp. Ceringin RT 03 RW 11, Desa Raga Jaya, Kecamatan Bojonggede, Kabupaten Bogor, Jawa Barat.','Jl. Raya Citayam-Parung, Kp. Ceringin RT 03 RW 11, Desa Raga Jaya, Kecamatan Bojonggede, Kabupaten Bogor, Jawa Barat.','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:44:20','2026-01-22 02:52:14'),(24,'CUSTKTWG','PKM Cijujung','company','082124482005','pkmcijujung@gmail.com','Jalan Raya Galuga Km 19, Kecamatan Cibungbulang, Kabupaten Bogor, Jawa Barat,','Jalan Raya Galuga Km 19, Kecamatan Cibungbulang, Kabupaten Bogor, Jawa Barat,','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:45:29','2026-01-22 02:55:01'),(25,'CUST9OKR','PKM Nanggung','company','(0251) 8681024','uptpuskesmasnanggung@yahoo.com','Jalan Ace Tabrani Km 5, Desa Parakan Muncang, Kecamatan Nanggung, Kabupaten Bogor, Jawa Barat','Jalan Ace Tabrani Km 5, Desa Parakan Muncang, Kecamatan Nanggung, Kabupaten Bogor, Jawa Barat','',0.00,30,'active',0,NULL,'2026-01-19 07:47:18','2026-01-20 04:40:46'),(26,'CUSTH8I6','PKM Tenjo','company','02159763850','pkmtenjo@gmail.com','Jl. Raya Tenjo Jasinga Rt. 3/2, Kec. Tenjo, Bogor ','Jl. Raya Tenjo Jasinga Rt. 3/2, Kec. Tenjo, Bogor ','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:48:12','2026-01-22 02:51:36'),(27,'CUSTS0IS','PKM Sentul','company','(021) 87912518','sentulpuskesmas@gmail.com',' Jl. Pintu III Sirkuit Sentul, Kec. Babakan Madang',' Jl. Pintu III Sirkuit Sentul, Kec. Babakan Madang','',0.00,30,'active',0,NULL,'2026-01-19 07:49:08','2026-01-20 04:39:05'),(28,'CUSTJS5R','PKM Gobang','company','0857-8064-3525','upfpuskesmasgobang@gmail.com',' Jl. Raya Gobang RT 01/RW 01, Desa Gobang, Kecamatan Rumpin, Kabupaten Bogor, Jawa Barat',' Jl. Raya Gobang RT 01/RW 01, Desa Gobang, Kecamatan Rumpin, Kabupaten Bogor, Jawa Barat','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:52:41','2026-01-22 02:56:29'),(29,'CUSTQO1E','PKM Ciawi ','company','(0251) 455234','puskesmasdtpciawi@gmail.com','Jalan Raya Mayor KHR Moh. Toha No. 287, Bendungan, Ciawi, Bogor','Jalan Raya Mayor KHR Moh. Toha No. 287, Bendungan, Ciawi, Bogor','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:55:07','2026-01-22 02:59:07'),(30,'CUST73PL','PKM Gunung Sindur','company','081380547004','pkmgunungsindur@yahoo.co.id','Jl. Pemuda No. 37, Desa Gunung Sindur, Kecamatan Gunung Sindur, Kabupaten Bogor, Jawa Barat ','Jl. Pemuda No. 37, Desa Gunung Sindur, Kecamatan Gunung Sindur, Kabupaten Bogor, Jawa Barat ','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 07:56:26','2026-01-22 03:00:20'),(31,'CUST6K4Z','PKM Balekambang','company','085720804066','upfbalekambang@gmail.com','Jl. Perkebunan Menteng RT003/RW003, Desa Bendungan Kec. Jonggol, Kab. Bogor ','Jl. Perkebunan Menteng RT003/RW003, Desa Bendungan Kec. Jonggol, Kab. Bogor ','',0.00,30,'active',0,NULL,'2026-01-19 07:58:19','2026-01-20 04:34:35'),(32,'CUSTEI21','PKM Banjarsari','government','(0251) 8205460','puskesmasbanjarsaritersehat@gmail.com','Jalan Veteran III Blok A 1 Rt 002/ Rw 002, Desa Banjarsari, Kecamatan Ciawi, Kabupaten Bogor','Jalan Veteran III Blok A 1 Rt 002/ Rw 002, Desa Banjarsari, Kecamatan Ciawi, Kabupaten Bogor','',0.00,30,'active',0,NULL,'2026-01-19 07:59:37','2026-01-21 03:58:45'),(33,'CUST4JBU','PKM Situ Udik','company','(0251) 8647587','upfpkm.situudik@gmail.com','i Jl. KH. Abdul Hamid, Situ Udik, Kecamatan Cibungbulang, Kabupaten Bogor, Jawa Barat','i Jl. KH. Abdul Hamid, Situ Udik, Kecamatan Cibungbulang, Kabupaten Bogor, Jawa Barat','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 08:00:33','2026-01-22 02:50:11'),(34,'CUSTPW4S','PKM Cogreg','company','0857-1766-6843','puskesmascogreg@gmail.com','Jl. Raya Pahlawan Rt.011/Rw. 006 Desa Cogreg Kec. Parung.','Jl. Raya Pahlawan Rt.011/Rw. 006 Desa Cogreg Kec. Parung.','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 08:01:15','2026-01-22 03:02:36'),(35,'CUSTRZEU','PKM Cihideung Udik','company','085777702338','upf.cihideungudik@gmail.com','Jl. Cihideung Girang Rt 003 Rw 009, Desa Cihideung Udik, Kecamatan Ciampea, Kabupaten Bogor, Jawa Barat','Jl. Cihideung Girang Rt 003 Rw 009, Desa Cihideung Udik, Kecamatan Ciampea, Kabupaten Bogor, Jawa Barat','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 08:02:45','2026-01-22 03:04:14'),(36,'CUST9RVN','PKM Gandoang','company','(021) 29232695','pkmgandoang@gmail.com','Jl. Raya Cileungsi-Jonggol Km.5, Desa Gandoang, Kec. Cileungsi, Kab. Bogor, Jawa Barat','Jl. Raya Cileungsi-Jonggol Km.5, Desa Gandoang, Kec. Cileungsi, Kab. Bogor, Jawa Barat','1368901403000',0.00,30,'active',0,NULL,'2026-01-19 08:04:03','2026-01-20 04:08:00'),(37,'CUSTO58R','PKM Kemuning','company','(0251) 8551994','upfkemuning@gmail.com','Jl. Raya Tonjong No. 1, Desa Cimanggis, Kecamatan Bojonggede, Kabupaten Bogor, Jawa Barat','Jl. Raya Tonjong No. 1, Desa Cimanggis, Kecamatan Bojonggede, Kabupaten Bogor, Jawa Barat','0001368901403000',0.00,30,'active',0,NULL,'2026-01-19 08:05:09','2026-01-22 03:05:02'),(38,'CUSTBERI','PKM Saketi','company','(0253) 401296','puskesmassaketi@gmail.com','Jl. Raya Labuan Km. 19, Kecamatan Saketi, Kabupaten Pandeglang, Banten','Jl. Raya Labuan Km. 19, Kecamatan Saketi, Kabupaten Pandeglang, Banten','1091031211360357',0.00,30,'active',0,NULL,'2026-01-19 08:06:16','2026-01-22 05:48:00'),(39,'CUSTS8CD','PKM Bojong','company','081283616351','upfbojong@gmail.com',' Jl. Raya Klapanunggal Cipeucang, Desa Bojong, RT 13/RW 07, Kecamatan Klapanunggal, Kabupaten Bogor, Jawa Barat',' Jl. Raya Klapanunggal Cipeucang, Desa Bojong, RT 13/RW 07, Kecamatan Klapanunggal, Kabupaten Bogor, Jawa Barat','',0.00,30,'active',0,NULL,'2026-01-19 08:08:03','2026-01-20 06:58:52'),(40,'CUSTODGJ','PKM Cipeucang','company','087874960818','puskesmas.cipeucang@gmail.com','l. Raya Klapanunggal Cipeucang Desa Bojong Rt 13/07 Kec. Klapanunggal, Kabupaten Bogor, Jawa Barat','l. Raya Klapanunggal Cipeucang Desa Bojong Rt 13/07 Kec. Klapanunggal, Kabupaten Bogor, Jawa Barat','1091031211062312',0.00,30,'active',0,NULL,'2026-01-19 08:09:08','2026-01-22 05:48:48'),(41,'CUSTNMBU','PKM Jagakarsa','company','(021) 22007047','puskesmas.kec.jagakarsa@gmail.com','Jl. Sirsak (Gg. Masjid Al Afiyah) No 1. RT.01 RW.02 , Desa/Kelurahan Jagakarsa, Kec. Jagakarsa','Jl. Sirsak (Gg. Masjid Al Afiyah) No 1. RT.01 RW.02 , Desa/Kelurahan Jagakarsa, Kec. Jagakarsa','',0.00,30,'active',0,NULL,'2026-01-19 08:12:00','2026-01-21 10:08:37'),(42,'CUST4GJ5','PKM Tanjung Priok','company','(021) 4367305','ppid@puskesmastanjungpriok.id','Jl. Papanggo IIB No. 69, Tanjung Priok, Jakarta Utara.','Jl. Papanggo IIB No. 69, Tanjung Priok, Jakarta Utara.','1247048048000',0.00,30,'active',0,NULL,'2026-01-19 08:13:58','2026-01-21 10:06:12'),(43,'CUST1N3V','LABKESDA Tasikmalaya','government','(0265) 332723','labkabtsm@gmail.com','Jl. Pancasila, No.27, Kota Tasikmalaya, Jawa Barat','Jl. Pancasila, No.27, Kota Tasikmalaya, Jawa Barat','',0.00,30,'active',0,NULL,'2026-01-19 09:21:21','2026-02-26 06:33:01'),(44,'CUSTBFDF','RSPPN Suyoto','company','(021) 7342012','info@rsppnsoedirman.co.id','Jl. RC. Veteran No. 178 Bintaro, Pesanggrahan, Kota Jakarta Selatan, DKI Jakarta','Jl. RC. Veteran No. 178 Bintaro, Pesanggrahan, Kota Jakarta Selatan, DKI Jakarta','',0.00,30,'active',0,NULL,'2026-01-20 07:06:19','2026-05-15 08:02:40'),(45,'CUSTF7CO','UPK Kemenkes','company','0811-1050-0567','klinikkemenkes@gmail.com','','','',0.00,30,'active',0,NULL,'2026-01-22 05:49:57','2026-01-22 05:49:57'),(46,'CUSTZMZS','PKM Kelapa dua ','company','(021) 38934045','Puskesmas.kelapadua@gmail.com','Jl. Layar IV Perum, Kelapa Dua, Tangerang','Jl. Layar IV Perum, Kelapa Dua, Tangerang','',0.00,30,'active',0,NULL,'2026-01-22 07:49:01','2026-01-22 07:49:01'),(47,'CUSTB0BC','PKM Cigudeg','company','(0251) 8683019','pkmcigudeg34@gmail.com','JL Raya Bogor Km 34 Kec. Cigudeg, Kabupaten Bogor,','JL Raya Bogor Km 34 Kec. Cigudeg, Kabupaten Bogor,','',0.00,30,'active',0,NULL,'2026-02-03 07:14:09','2026-02-03 07:14:09'),(48,'CUSTJMKO','PKM Ciampea Udik','company','085777702338 ','upfciampeaudik@gmail.com','Kp. Cibuntu Kaum RT.004 RW.001 Desa Cibuntu Kec.Ciampea, Kab.Bogor','Kp. Cibuntu Kaum RT.004 RW.001 Desa Cibuntu Kec.Ciampea, Kab.Bogor','',0.00,30,'active',0,NULL,'2026-02-04 07:06:03','2026-02-11 08:09:36'),(49,'CUSTHN4K','PKM Cijayanti','company','(0251) 8271563','pkmcijayanti@gmail.com','Jl. Raya Cijayanti No. 6 Rt 002/006 Desa Cijayanti Kec. Babakan Madang','Jl. Raya Cijayanti No. 6 Rt 002/006 Desa Cijayanti Kec. Babakan Madang','',0.00,30,'active',0,NULL,'2026-02-10 03:55:35','2026-02-10 03:56:26'),(50,'CUSTDY0I','PKM Citeureup','company','(021) 87942859','uptpuskesmasciteureup@yahoo.co.id','Jl. Mayor Oking Kamurang RT 02 RW 04 Kelurahan Puspanegara Kecamatan Citeureup Kabupaten Bogor','Jl. Mayor Oking Kamurang RT 02 RW 04 Kelurahan Puspanegara Kecamatan Citeureup Kabupaten Bogor','',0.00,30,'active',0,NULL,'2026-02-18 06:25:48','2026-02-18 06:25:48'),(51,'CUSTJY5I','PKM Sukanegara','company','081328447192','Upf.sukanegara@gmail.com','Jl. Cipamingkis Dayeuh RT 01/04 Desa Sukanegara Kec. Jonggol Kab. Jonggol','Jl. Cipamingkis Dayeuh RT 01/04 Desa Sukanegara Kec. Jonggol Kab. Jonggol','',0.00,30,'active',0,NULL,'2026-02-24 02:26:31','2026-02-24 02:26:31'),(52,'CUST2L5S','PKM Ciseeng','company','0251-8541971','uptpuskesmasciseengnew@gmail.com','Jl. H.Usa no.1 Desa Cibentang, Kec. Ciseeng, Kab. Bogor, Cibentang, Ciseeng, Kab. Bogor, Jawa Barat, 16120','Jl. H.Usa no.1 Desa Cibentang, Kec. Ciseeng, Kab. Bogor, Cibentang, Ciseeng, Kab. Bogor, Jawa Barat, 16120','00.136.890.1-403.000',0.00,30,'active',0,NULL,'2026-02-25 08:38:50','2026-02-25 08:38:50'),(53,'CUSTLJ24','CV. Meyda Jaya Sentosa','company','081332640679','meydajayasentosa.cv@gmail.com','Jl. Mojo III Gang Dahlia No 34B-Surabaya Jawa Timur','Jl. Mojo III Gang Dahlia No 34B-Surabaya Jawa Timur','',0.00,30,'active',0,NULL,'2026-03-10 09:02:26','2026-03-10 09:02:26'),(54,'CUSTXN3H','PKM Leuwisadeng ','company','085813701756','uptpkmleuwisadeng@yahoo.com','Jln Raya Bogor Jasinga Km 25 Desa Leuwisadeng Kab Bogor','Jln Raya Bogor Jasinga Km 25 Desa Leuwisadeng Kab Bogor','001368901403000',0.00,30,'active',0,NULL,'2026-04-01 03:02:00','2026-04-01 03:30:43'),(55,'CUSTHMCD','PKM Tajur','company','+62 819-5892-5652','pkmtajur1013@gmail.com',' Jl. Raya Tajur Leuwi Bilik Km 01, Kec. Citeureup, Kabupaten Bogor',' Jl. Raya Tajur Leuwi Bilik Km 01, Kec. Citeureup, Kabupaten Bogor','001368901403000',0.00,30,'active',0,NULL,'2026-04-23 03:58:01','2026-04-23 04:03:18'),(56,'CUST7F1B','Puskesmas Gobang','government','081219801233','pfpuskesmasgobang@gmail.com','jalan raya gobang rt 01 rw 01 ','jalan raya gobang rt 01 rw 01 ','',0.00,30,'active',0,NULL,'2026-05-07 06:36:48','2026-05-07 06:37:37'),(57,'CUSTOJ31','PKM Ciampea','company','085813701756','upt.pkmciampea@gmail.com','Jl. Letnan Sukarna No,32 Desa Benteng RT 07 RW 01 Kecamatan Ciampea Kabupaten Bogor','Jl. Letnan Sukarna No,32 Desa Benteng RT 07 RW 01 Kecamatan Ciampea Kabupaten Bogor','001368901403000',0.00,30,'active',0,NULL,'2026-05-11 08:22:07','2026-05-11 08:22:07'),(58,'CUST8G6K','PT. MUARA SAKTI','company','022 87524622','pt.muarasakti@gmail.com','Jl Batu Nunggal Indah Raya No. 11-11A Bandung','Jl Batu Nunggal Indah Raya No. 11-11A Bandung','315656900424000',0.00,30,'active',0,NULL,'2026-05-13 02:47:04','2026-05-13 02:47:04');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tax_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_terms` int DEFAULT '30',
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_code` (`supplier_code`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (15,'SUP3UUF','PT SUPPLIER OBAT','RENDY','089953234234','supplier@gmail.com','JL. KAMPUNG MLAYU','12.312312','BCA','40003242',30,'active',0,NULL,'2026-01-06 00:05:54','2026-01-06 00:05:54'),(16,'SUP9EPX','Online','n.a','0000000000','supplier@email.com','','000000000000','BCA','00000000000',30,'active',0,NULL,'2026-01-08 16:12:44','2026-01-08 16:12:44'),(17,'SUPL2UX','PT KLIPINDO PLASTIK PRATAMA','Deni','085817133188','','Jl. Baru Kemang No. 18 RT 02/RW 09 Kabupaten Bogor, Jawa Barat','','BCA','0953880366',9,'active',0,NULL,'2026-01-14 05:00:43','2026-01-14 05:00:43'),(18,'SUP0GAS','PT. TOP POINT','Ika','089509788716','','Kec. Cileungsi, Pasir Angin, Kabupaten Bogor, Jawa Barat','','BCA','5725074988',30,'active',0,NULL,'2026-01-15 07:53:31','2026-01-15 07:53:31'),(19,'SUP2BCI','PT. SANGIANG KARYA MANDIRI','Mita','082280687258','','Ruko Ubud Village Blok Kuta B No7, RT.001/RW.001, Sudimara Tim., Kec. Ciledug, Kota Tangerang, Banten 15151','','BCA','3721831220',30,'active',0,NULL,'2026-01-19 09:34:09','2026-01-19 09:34:09'),(20,'SUPQTGN','PT. BURHAN SEJAHTERA MULIA','Yati','08119004755','','Gedung Graha BSM, Jl. Kayu Manis Timur No.11 lt.1, RT.6/RW.1, Kayu Manis, Kec. Matraman, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13130','','Mandiri','0060010762445',30,'active',0,NULL,'2026-01-19 10:11:35','2026-01-19 10:11:35'),(21,'SUP55PW','PT TRIPATRIA ANDALAN MEDIKA','Vika','081383475260','','Jl. Musi No.37 Jakarta','','BCA','8780360888',30,'active',0,NULL,'2026-01-21 05:25:41','2026-01-21 05:25:41'),(22,'SUPTCH8','PT ANDALAN SETIA SUKSES','Iskak','08113345699','','Jl. Jatisari Besar, Kec. Waru, Kab. Sidoarjo','','','',1,'active',0,NULL,'2026-01-22 02:43:37','2026-01-22 02:43:37'),(23,'SUPPRNE','PT BIONTEK SINERGI MEDIKATAMA','Iskak','08113345699','','Jl. Graha Anggrek Mas A No.49, Prapatan, Pagerwojo, Kec. Buduran, Kabupaten Sidoarjo, Jawa Timur 61252','','','',1,'active',0,NULL,'2026-01-23 02:59:03','2026-01-23 02:59:03'),(24,'SUPQIP7','PT PORTAL BIZ NUSANTARA','Admin','081615071998','','RBB Mangga Dua Mall Blok F1 no 5','','BCA','6930315522',1,'active',0,NULL,'2026-01-30 02:48:47','2026-01-30 02:48:47'),(25,'SUPTIVC','PT SETIA GUNA MEDIKA','DESI','08119004755','','Komplek Taman Kebon Jeruk AAIV No39-40 South Meruya, Kembangan, West Jakarta','','MAYBANK INDONESIA','2077371854',1,'active',0,NULL,'2026-02-23 04:24:57','2026-02-24 05:04:39'),(26,'SUPTDR2','PT WHIRA PITOE','Bedu','081113015500','','Jl. Jend R.S. Soekanto No.10 Kec. Duren Sawit, Jakarta Timur','','MANDIRI','0060099909990',1,'active',0,NULL,'2026-02-25 04:12:05','2026-02-25 04:12:05'),(27,'SUP9JZK','PT MULTI MEDILAB KARYA MANDIRI','Jumi','(021) 3972-9191','','GP Plaza Lantai 3 Unit 6, Jl. Gelora II No. 01 Rt. 01/01, Kel. Gelora, Kec. Tanah Abang, Jakarta Pusat - 10270.','','','',30,'active',0,NULL,'2026-03-10 09:07:10','2026-03-10 09:07:10'),(28,'SUPJ2QQ','DHYAS MITRA USAHA','Fitri','085143587633','','Ruko Kirana Mas No.3A Jl.Letda Nasir Gn.Putri Bogor','','MANDIRI','1330077733335',1,'active',0,NULL,'2026-04-02 07:34:31','2026-04-02 07:34:31'),(29,'SUPXT7Q','PT BERKAH INSTALASI MEDIKA','Viga','0895412760163','','jl. paseban dalam, no 1d, senen, jakarta pusat','','BCA','0696067199',1,'active',0,NULL,'2026-04-13 06:39:50','2026-04-13 06:39:50'),(30,'SUPUYK9','PT MITRA BAHAGIA CITRA MEDIKA','Admin','082113992642','','Rukan Miami Blok B/7A Cengkareng','','BCA','0880486888',1,'active',0,NULL,'2026-04-17 05:04:40','2026-04-17 05:04:40'),(31,'SUPPH6C','PT TRI ANUGERAH JAYA','Frankie','081292252990','','Kebon Jeruk','','BCA','2873065877',30,'active',0,NULL,'2026-05-11 08:50:26','2026-05-11 08:50:26'),(32,'SUPGIR5','PT HIDAYAH TRIPUTRA MEDIKA','Bagas','081210913979','','Jl. Curug Jaya No. 21 RT. 05/01 Kel. Jaticempaka, Pondok Gede','','ocbc','027800011457',1,'active',0,NULL,'2026-05-13 03:34:22','2026-05-13 03:34:22');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(15,0) DEFAULT '0',
  `cost_price` decimal(15,0) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `unit_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_code` (`product_code`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (4,'PRODI8WN','PARAMEK','','CATOG2M',50000,5000,1,0,NULL,'2026-01-06 00:09:50','2026-01-06 00:09:50',NULL),(5,'PRODLBYZ','Yellow Tip box','','CAT29G8',0,0,1,0,NULL,'2026-01-08 16:31:22','2026-01-08 16:31:22',NULL),(6,'PROD38FI','Blue Tip mikropipet','','CAT29G8',0,0,1,0,NULL,'2026-01-08 16:31:37','2026-01-08 16:31:37',NULL),(7,'PRODI51V','Easy Toach Kolesterol','','CAT29G8',0,0,1,0,NULL,'2026-01-12 08:44:27','2026-01-12 08:44:27',NULL),(8,'PRODRPYZ','Easy Toach Asam Urat','','CAT29G8',220324,0,1,0,NULL,'2026-01-12 08:44:50','2026-02-05 02:49:28',NULL),(9,'PRODUD44','Plastik Klip Obat Polos 12 x 20 cm','','CATM600',19000,0,1,0,NULL,'2026-01-14 05:13:23','2026-01-14 05:14:45',NULL),(10,'PRODNR98','Plastik Klip Obat Logo 10 x 15 cm','','CATM600',19500,0,1,0,NULL,'2026-01-14 05:15:32','2026-01-19 04:31:07',NULL),(11,'PRODT1S4','Plastik Klip Obat Polos 30 x 40 cm','','CATM600',71000,0,1,0,NULL,'2026-01-14 05:16:25','2026-01-14 05:16:25',NULL),(12,'PRODC7UH','Infusion Set Advance Safety TP','','CATNFAA',22500,0,1,0,NULL,'2026-01-15 04:36:04','2026-01-15 04:36:04',NULL),(13,'PRODHW0P','Stik Gula Darah Fora','','CATTPH8',138600,0,1,0,NULL,'2026-01-19 09:22:33','2026-01-19 09:22:33',NULL),(14,'PRODRPK7','Tabung Kuning Gel','','CAT29G8',235000,0,1,0,NULL,'2026-01-19 09:23:29','2026-01-19 09:23:29',NULL),(15,'PRODE9LM','Yellow Tip','','CAT29G8',120000,0,1,0,NULL,'2026-01-19 09:25:57','2026-01-19 09:25:57',NULL),(16,'PRODUXGE','Reagen NAPZA','','CAT85K9',1900000,0,1,0,NULL,'2026-01-19 09:26:39','2026-01-19 09:26:39',NULL),(17,'PRODD3EF','M6 DS Diluent 20 liter Mindray','Merk Mindray','CAT85K9',1776472,0,1,0,NULL,'2026-01-21 03:27:49','2026-01-21 03:32:49',NULL),(18,'PRODCE8K','Probe Cleanser Mindray','','CAT85K9',616442,0,1,0,NULL,'2026-01-21 03:32:36','2026-01-21 03:32:36',NULL),(19,'PRODPNO2','Control 3 Diff Hematologi Mindray','','CAT85K9',1235293,0,1,0,NULL,'2026-01-21 03:34:33','2026-01-21 03:34:33',NULL),(20,'PRODKSIS','HbA1C Tes Kit Hypro','','CAT29G8',2402595,0,1,0,NULL,'2026-01-21 03:38:05','2026-01-21 03:38:05',NULL),(21,'PRODSXUK','Microalbumin Hypro','','CAT29G8',1922076,0,1,0,NULL,'2026-01-21 03:39:11','2026-01-21 03:39:11',NULL),(22,'PROD5PQ5','Kertas Printout Mindray','','CAT29G8',154973,0,1,0,NULL,'2026-01-21 03:41:20','2026-01-21 04:32:07',NULL),(23,'PROD85PG','Jarum Citoject','','CAT6A0C',187845,0,1,0,NULL,'2026-01-21 04:39:24','2026-01-21 04:39:43',NULL),(24,'PRODF0S8','Carpule Citoject','','CAT6A0C',512000,0,1,0,NULL,'2026-01-21 04:41:13','2026-01-21 04:41:40',NULL),(25,'PRODJN1S','Biosponge','','CAT6A0C',315923,0,1,0,NULL,'2026-01-21 04:45:26','2026-01-21 04:45:26',NULL),(26,'PROD0O39','Etsa Merk Any-Etch ','Bahan Tambal Gigi','CAT6A0C',297138,0,1,0,NULL,'2026-01-21 04:50:42','2026-01-21 04:50:42',NULL),(27,'PRODSLEO','Tampon Steril  ','','CAT6A0C',42692,0,1,0,NULL,'2026-01-21 04:51:25','2026-01-21 04:51:25',NULL),(28,'PRODYWNL','Catgut USP 5/0','Benang jahit dengan jarum 5/0','CAT6A0C',206630,0,1,0,NULL,'2026-01-21 04:52:45','2026-01-21 04:52:45',NULL),(29,'PROD3ROX','Catgut USP 4/0','Benang jahit dengan jarum 4/0','CAT6A0C',187845,0,1,0,NULL,'2026-01-21 04:53:43','2026-01-21 04:53:43',NULL),(30,'PRODHORF','Cotton roll','','CAT6A0C',85385,0,1,0,NULL,'2026-01-21 04:54:18','2026-01-21 04:54:18',NULL),(31,'PRODWGEQ','Cotton pellet','','CAT6A0C',51230,0,1,0,NULL,'2026-01-21 04:54:55','2026-01-21 04:54:55',NULL),(32,'PROD58Q5','Suction','','CAT6A0C',111000,0,1,0,NULL,'2026-01-21 04:55:27','2026-01-21 04:55:27',NULL),(33,'PRODI0ZT','Aquadest 20 L','','CATM600',313000,0,1,0,NULL,'2026-01-21 04:56:08','2026-01-21 04:56:08',NULL),(34,'PRODZNXS','Blood Lancet','','CATNFAA',28433,0,1,0,NULL,'2026-01-21 04:57:03','2026-01-21 04:57:03',NULL),(35,'PRODYDSW','Cuticell','','CAT6A0C',34154,0,1,0,NULL,'2026-01-21 04:57:34','2026-01-21 04:57:34',NULL),(36,'PRODZEMU','Spuit 1 cc','','CATNFAA',105900,0,1,0,NULL,'2026-01-21 05:00:10','2026-01-21 05:00:10',NULL),(37,'PRODY81Q','Ultrasound gel','','CATM600',33300,0,1,0,NULL,'2026-01-21 05:01:29','2026-01-21 05:01:29',NULL),(38,'PRODI3R4','Microbrush','','CAT6A0C',145154,0,1,0,NULL,'2026-01-21 05:01:56','2026-01-21 05:01:56',NULL),(39,'PRODFO3S','GC Fuji Glass Ionomer','','CAT6A0C',1921154,0,1,0,NULL,'2026-01-22 02:28:35','2026-01-22 02:33:18',NULL),(40,'PRODNSRO','AC Polytron','AC 1 PK','CATRCD4',5800000,0,1,0,NULL,'2026-01-30 02:47:18','2026-01-30 02:47:18',NULL),(41,'PRODNPUU','Dental Kit Onemed','','CAT6A0C',384230,0,1,0,NULL,'2026-01-30 02:48:06','2026-01-30 02:48:06',NULL),(42,'PRODQ5TM','Dopler Hi-bebe','','CATNFAA',1221699,0,1,0,NULL,'2026-01-30 02:49:10','2026-01-30 02:49:10',NULL),(43,'PROD5CI8','Laptop Acer 17 ','512 gb','CATRCD4',4890000,0,1,0,NULL,'2026-01-30 02:50:52','2026-01-30 02:50:52',NULL),(44,'PRODW80L','PC Lenovo A100','','CATRCD4',13320000,0,1,0,NULL,'2026-02-04 06:25:43','2026-02-04 06:25:43',NULL),(45,'PRODQOOQ','Eugenol','','CAT29G8',111000,0,1,0,NULL,'2026-02-05 02:51:57','2026-02-05 02:51:57',NULL),(46,'PRODAYHY','Ceivitron/Temporary Filling','','CAT6A0C',136614,0,1,0,NULL,'2026-02-05 02:52:51','2026-04-23 03:45:24',NULL),(47,'PRODHJBF','Glass Ionomer','','CAT6A0C',136615,0,1,0,NULL,'2026-02-05 02:53:32','2026-02-05 02:53:32',NULL),(48,'PRODR9WL','Kasa Gulung 10 cm','','CATM600',11000,0,1,0,NULL,'2026-02-05 02:54:23','2026-02-05 02:54:23',NULL),(49,'PROD9DKH','Pasta Devitalisasi Non Arsen','','CAT6A0C',430000,0,1,0,NULL,'2026-02-05 02:55:01','2026-02-05 02:55:01',NULL),(50,'PRODUCFV','CHKM','','CAT6A0C',157107,0,1,0,NULL,'2026-02-05 02:58:09','2026-02-05 02:58:09',NULL),(51,'PRODN683','Bonding Palpique','','CAT6A0C',192115,0,1,0,NULL,'2026-02-05 02:58:50','2026-02-05 02:59:04',NULL),(52,'PRODTUCJ','Komposit Resin A1, A2, A3','','',298846,0,1,0,NULL,'2026-02-05 03:00:48','2026-02-05 03:00:48',NULL),(53,'PROD2A8B','Plastik Klip Obat 10 x 7 cm','','CATM600',12000,0,1,0,NULL,'2026-02-10 03:50:33','2026-02-10 03:50:33',NULL),(54,'PROD8LUJ','Plastik Klip Obat 13 x 8.7 cm','','CATM600',13000,0,1,0,NULL,'2026-02-10 03:51:12','2026-02-10 03:51:12',NULL),(55,'PRODEJWU','Micro Aplicator','','CAT6A0C',23054,0,1,0,NULL,'2026-02-11 08:04:18','2026-02-11 08:04:18',NULL),(56,'PRODZNFW','Silk 3/0','','CATM600',208509,0,1,0,NULL,'2026-02-11 08:05:14','2026-02-11 08:05:14',NULL),(57,'PRODGVG3','Kertas Termal','','CAT8TD7',28650,0,1,0,NULL,'2026-02-11 08:20:31','2026-02-11 08:20:31',NULL),(58,'PRODCAMT','Kertas F4 75 gram','','CAT8TD7',87875,0,1,0,NULL,'2026-02-11 08:21:26','2026-02-11 08:21:41',NULL),(59,'PRODYXGJ','Set Widal Salmonella','','CATTPH8',1491200,0,1,0,NULL,'2026-02-23 03:19:22','2026-02-23 03:19:22',NULL),(60,'PRODDOJX','Tabung EDTA 3 ml','','',163170,0,1,0,NULL,'2026-02-23 03:20:43','2026-02-23 03:20:43',NULL),(61,'PRODUHYL','Set Golongan Darah','','CATTPH8',576000,0,1,0,NULL,'2026-02-23 03:24:49','2026-02-23 03:24:49',NULL),(62,'PROD0ZC5','Strip Urine 10 Parameter','','CATTPH8',198001,0,1,0,NULL,'2026-02-23 03:27:39','2026-02-23 03:27:39',NULL),(63,'PROD5GHT','Infusion Set Advance Safety (TP)','','CATM600',20250,0,1,0,NULL,'2026-02-24 08:43:04','2026-02-24 08:46:01',NULL),(64,'PRODZ5DH','Reagen NAPZA','','CAT85K9',1900000,0,1,0,NULL,'2026-02-25 04:01:47','2026-02-25 04:01:47',NULL),(65,'PRODR0OW','Reagen HDL Biomaxima','','CAT85K9',4673100,0,1,0,NULL,'2026-02-25 04:02:20','2026-02-25 04:02:20',NULL),(66,'PRODIIMD','Stik Urin Glukosa (Verify)','','',170000,0,1,0,NULL,'2026-02-25 04:03:08','2026-02-25 04:03:08',NULL),(67,'PRODHZOS','Tip Clinipete','','CAT29G8',120000,0,1,0,NULL,'2026-02-25 04:03:45','2026-02-25 04:03:45',NULL),(68,'PRODLXN9','Plastik klip obat 13 x 8.7 Sablon Logo','sablon logo custom','CATM600',9900,0,1,0,NULL,'2026-02-25 08:00:04','2026-02-25 08:01:02',NULL),(69,'PROD8C34','Plastik klip obat 13 x 8.7 sablon polos','sablon biasa','CATM600',9900,0,1,0,NULL,'2026-02-25 08:02:19','2026-02-25 08:02:31',NULL),(70,'PRODC4BE','Hba1C 30 T','','CAT85K9',3825000,0,1,0,NULL,'2026-03-10 08:59:34','2026-03-10 08:59:34',NULL),(71,'PRODU1TW','Timbangan Bayi Manual (onehealth)','','CATNFAA',450000,0,1,0,NULL,'2026-04-01 03:00:03','2026-04-01 03:00:03',NULL),(72,'PRODQCH6','Timbangan Injak Manual','','CATNFAA',175000,0,1,0,NULL,'2026-04-01 03:01:36','2026-04-01 03:01:36',NULL),(73,'PRODZ9RK','Pengukur Tinggi Badan Digital','','CATNFAA',255000,0,1,0,NULL,'2026-04-01 03:02:29','2026-04-01 03:02:29',NULL),(74,'PRODGA40','Tensimeter Digital ','','CATNFAA',700000,0,1,0,NULL,'2026-04-01 03:03:30','2026-04-01 03:03:30',NULL),(75,'PROD734W','Oximeter','','CATNFAA',340000,0,1,0,NULL,'2026-04-01 03:04:01','2026-04-01 03:04:01',NULL),(76,'PRODE950','Tensimeter Manual','','CATNFAA',398000,0,1,0,NULL,'2026-04-01 03:04:46','2026-04-01 03:04:46',NULL),(77,'PROD0WIK','Thermometer Digital','','CATNFAA',850000,0,1,0,NULL,'2026-04-01 03:05:29','2026-04-01 03:05:29',NULL),(78,'PRODG2LP','Sarung Tangan IONPLUS','','CATM600',58500,0,1,0,NULL,'2026-04-02 03:55:41','2026-04-02 03:55:41',NULL),(79,'PROD10YA','Strip HB BIO AID','','CATTPH8',435000,0,0,0,NULL,'2026-04-02 03:56:50','2026-05-22 03:51:37',NULL),(80,'PROD4CIK','Spuit 3 cc BD','','CATM600',250000,0,1,0,NULL,'2026-04-08 02:32:21','2026-04-08 02:32:21',NULL),(81,'PROD91MV','Spuit 5 cc Terumo','','CATM600',433333,0,1,0,NULL,'2026-04-08 02:33:03','2026-04-08 02:33:18',NULL),(82,'PROD3KBA','Masker ','','CATM600',45000,0,1,0,NULL,'2026-04-08 02:34:03','2026-04-08 02:34:03',NULL),(83,'PRODI604','Handsanitizer','','CAT85K9',43500,0,1,0,NULL,'2026-04-08 07:59:03','2026-04-08 07:59:03',NULL),(84,'PRODE8FN','Charger USG','','CATRCD4',2910000,0,1,0,NULL,'2026-04-09 05:34:48','2026-04-09 05:34:48',NULL),(85,'PROD0RM3','Hb Meter Mission','','CATNFAA',1255000,0,1,0,NULL,'2026-04-17 04:54:03','2026-04-17 04:54:03',NULL),(86,'PRODSBHG','Ozyme 1 Liter','','CAT85K9',215000,0,1,0,NULL,'2026-04-20 03:01:08','2026-04-20 03:01:08',NULL),(87,'PRODGZ9J','Tabung Plain Merah','','CAT29G8',144000,0,1,0,NULL,'2026-04-20 03:01:52','2026-04-20 03:01:52',NULL),(88,'PRODYVKO','M30 Lyse 500 mL','','CAT85K9',1705800,0,1,0,NULL,'2026-04-20 03:02:46','2026-04-20 03:02:46',NULL),(89,'PRODSNFT','Oil Imersi','','CAT29G8',759200,0,1,0,NULL,'2026-04-20 03:03:31','2026-04-20 03:03:31',NULL),(90,'PRODM6IW','Set Golongan Darah dan Kartu Goldar','','CAT29G8',606700,0,1,0,NULL,'2026-04-20 03:04:34','2026-04-20 03:04:34',NULL),(91,'PRODBZPV','M30 Diluent 20 Liter','','CAT85K9',1704200,0,1,0,NULL,'2026-04-20 03:05:09','2026-04-20 03:05:09',NULL),(92,'PRODHTQ5','Sediplast Tabung LED 259','','CAT29G8',3538000,0,1,0,NULL,'2026-04-20 03:06:01','2026-04-20 03:06:01',NULL),(93,'PRODXKS5','Reagen HDL Kolesterol Labiosis','','CAT85K9',592000,0,1,0,NULL,'2026-04-20 03:07:02','2026-04-20 03:07:02',NULL),(94,'PROD3NIU','Bonding  Palpique','','CAT6A0C',173400,0,1,0,NULL,'2026-04-23 03:39:26','2026-04-23 03:39:26',NULL),(95,'PRODLZT0','Tespack','','CATTPH8',104000,0,1,0,NULL,'2026-04-23 03:40:12','2026-04-23 03:40:12',NULL),(96,'PROD6Y81','Hypafix','','CATM600',44610,0,1,0,NULL,'2026-04-23 03:43:19','2026-04-23 03:43:19',NULL),(97,'PRODB7U2','CRP','Merk Mispa-i2','CAT85K9',0,0,1,0,NULL,'2026-05-04 07:41:55','2026-05-04 07:41:55',NULL),(98,'PRODZ2SS','RF ','Mispa-i2','CAT85K9',0,0,1,0,NULL,'2026-05-04 07:42:23','2026-05-04 07:42:23',NULL),(99,'PRODZQ20','SCHE Ject Needle','','CAT6A0C',0,0,1,0,NULL,'2026-05-07 06:38:58','2026-05-07 06:38:58',NULL),(100,'PRODNTRM','Kartu Golongan Darah','','CAT29G8',0,0,1,0,NULL,'2026-05-07 06:39:20','2026-05-07 06:39:20',NULL),(101,'PRODKIDH','Betadin Kumur','','CAT6A0C',0,0,1,0,NULL,'2026-05-07 06:39:50','2026-05-07 06:39:50',NULL),(102,'PRODZ1F6','Cavity Liner','','CAT6A0C',0,0,1,0,NULL,'2026-05-07 06:40:13','2026-05-07 06:40:13',NULL),(103,'PRODKZMX','Sterilisator Fortune','','CAT29G8',0,0,1,0,NULL,'2026-05-11 08:24:41','2026-05-11 08:24:41',NULL),(104,'PROD6246','Burnishir O','','CAT6A0C',42600,0,1,0,NULL,'2026-05-11 08:33:17','2026-05-11 08:33:17',NULL),(105,'PRODRIPQ','Ash 49 Plastis Instrumen','','CAT6A0C',64800,0,1,0,NULL,'2026-05-11 08:35:44','2026-05-11 08:35:54',NULL),(106,'PROD85C3','Ekskavator','','CAT6A0C',230700,0,1,0,NULL,'2026-05-11 08:36:56','2026-05-11 08:36:56',NULL),(107,'PROD9LMM','Burnishir Y','','CAT6A0C',42600,0,1,0,NULL,'2026-05-11 08:37:41','2026-05-11 08:37:41',NULL),(108,'PRODXK8X','Diamond Bur Gigi','','CAT6A0C',192000,0,1,0,NULL,'2026-05-11 08:38:20','2026-05-11 08:38:20',NULL),(109,'PROD1F4K','Pinset','','CAT6A0C',53800,0,1,0,NULL,'2026-05-11 08:38:47','2026-05-11 08:38:47',NULL),(110,'PRODRYIF','Spatula Semen Stainless','','CAT6A0C',64800,0,1,0,NULL,'2026-05-11 08:39:35','2026-05-11 08:39:35',NULL),(111,'PRODY7UW','Stopper Semen','','CAT6A0C',42600,0,1,0,NULL,'2026-05-11 08:40:03','2026-05-11 08:40:03',NULL),(112,'PRODUUIA','Sonde','','CAT6A0C',23000,0,1,0,NULL,'2026-05-11 08:40:25','2026-05-11 08:40:25',NULL),(113,'PRODJBGO','Kaca Mulut','','CAT6A0C',166600,0,1,0,NULL,'2026-05-11 08:40:56','2026-05-11 08:40:56',NULL),(114,'PRODTHFU','Poleshing Bur Batu Putih Bulat','','CAT6A0C',56300,0,1,0,NULL,'2026-05-11 08:41:36','2026-05-11 08:41:36',NULL),(115,'PRODC7I1','Mindray Electrocardiograph','','CATNFAA',21621622,0,1,0,NULL,'2026-05-13 02:41:26','2026-05-13 02:41:47',NULL),(116,'PROD1G6P','Pengukur Tinggi Badan Manual','','CATNFAA',0,0,1,0,NULL,'2026-05-18 02:20:57','2026-05-18 02:20:57',NULL),(117,'PRODIU1X','Penlight White','','CATNFAA',0,0,1,0,NULL,'2026-05-18 02:21:23','2026-05-18 02:21:23',NULL),(118,'PRODQRVZ','Timbangan Bayi Digital Indomed','','CATNFAA',0,0,1,0,NULL,'2026-05-18 02:22:18','2026-05-18 02:22:18',NULL),(119,'PRODY0SD','Timbangan Digital ','','CATNFAA',0,0,1,0,NULL,'2026-05-18 02:23:09','2026-05-18 02:23:09',NULL),(120,'PRODP6SY','Viewer Xray','','CATNFAA',0,0,1,0,NULL,'2026-05-18 02:24:35','2026-05-18 02:24:35',NULL),(121,'PRODNOOP','GV Set','','CATNFAA',0,0,1,0,NULL,'2026-05-18 02:25:28','2026-05-18 02:25:28',NULL),(122,'PROD0GH4','Hecting Set','','CATNFAA',0,0,1,0,NULL,'2026-05-18 02:25:44','2026-05-18 02:25:44',NULL),(123,'PROD6KVA','Pasta Devitalisasi 6 gram','','CAT6A0C',395000,0,1,0,NULL,'2026-05-21 03:13:43','2026-05-21 03:13:43',NULL),(124,'PRODOFPT','Ethyl Klorida','','CAT6A0C',240000,0,1,0,NULL,'2026-05-21 03:14:23','2026-05-21 03:14:23',NULL),(125,'PRODRR4E','Oco pembersih gigi 15  ml','','CAT6A0C',380000,0,1,0,NULL,'2026-05-21 03:15:05','2026-05-21 03:15:05',NULL),(126,'PROD47I2','Gel Oral Anestesi','','CAT6A0C',180000,0,1,0,NULL,'2026-05-21 03:16:15','2026-05-21 03:17:14',NULL),(127,'PRODVAZR','Komposit A3, A3.5','','CAT6A0C',565000,0,1,0,NULL,'2026-05-21 03:16:58','2026-05-21 03:16:58',NULL),(128,'PRODKBV2','Plastik Klip Polos ','','CATM600',16500,0,1,0,NULL,'2026-05-22 06:27:56','2026-05-22 06:27:56',NULL),(129,'PRODOHU9','TP Double Spike ','','',3333,0,1,0,NULL,'2026-05-22 08:54:38','2026-05-22 08:54:38',NULL),(130,'PRODM91Z','TP Feeding Tube FR8 100cm ','','',7658,0,1,0,NULL,'2026-05-22 08:57:37','2026-05-22 08:59:58',NULL),(131,'PROD226R','TP Feeding Tube FR5 100cm ','','',7658,0,1,0,NULL,'2026-05-22 09:00:53','2026-05-22 09:00:53',NULL),(132,'PRODI1M1','TP Stomach Tube FR12 125cm ','','',7387,0,1,0,NULL,'2026-05-22 09:04:08','2026-05-22 09:04:08',NULL),(133,'PROD2LQM','TP Stomach Tube FR16 125cm','','',7387,0,1,0,NULL,'2026-05-22 09:06:52','2026-05-22 09:06:52',NULL),(134,'PROD8RZV','TP Stomach Tube FR18 125cm ','','',7387,0,1,0,NULL,'2026-05-22 09:09:19','2026-05-22 09:09:19',NULL),(135,'PRODHKNU','TP Feeding Tube FR8 40 cm ','','',7658,0,1,0,NULL,'2026-05-22 09:12:06','2026-05-22 09:12:06',NULL),(136,'PROD9XED','TP Feeding Tube FR10 100cm ','','',7658,0,1,0,NULL,'2026-05-22 09:14:25','2026-05-22 09:14:25',NULL),(137,'PRODSU7I','Stomach Tube FR14 125cm ','','',150,0,1,0,NULL,'2026-05-22 09:16:35','2026-05-22 09:16:35',NULL),(138,'PROD5AMK','Biocal (Multicalibrator)','','',2705405,0,1,0,NULL,'2026-05-22 09:42:43','2026-05-22 09:42:43',NULL),(139,'PRODL3S4','Handscoon Size S','','',68177,0,1,0,NULL,'2026-05-22 09:45:41','2026-05-22 09:45:41',NULL),(140,'PRODMZG1','Alkohol Swab','','',16216,0,1,0,NULL,'2026-05-22 09:48:35','2026-05-22 09:48:35',NULL),(141,'PROD1131','Reagen Bilirubin Total','','',513514,0,1,0,NULL,'2026-05-22 09:59:56','2026-05-22 09:59:56',NULL),(142,'PROD0N6L','Reagen Bilirubin Direct','','',585586,0,1,0,NULL,'2026-05-22 10:00:49','2026-05-22 10:00:49',NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` VALUES (3,'CATOG2M','Obat','Untuk Obat',1,'2026-01-06 00:06:37',1,'2026-01-19 04:44:37'),(4,'CAT29G8','Alat Laboratorium','Barang-barang Lab',1,'2026-01-08 16:27:15',0,NULL),(5,'CATZF1J','SYRINGE WITH NEEDLE 3 ML BOX','Alat Lab',1,'2026-01-08 16:27:43',1,'2026-01-08 16:30:31'),(6,'CATM600','BMHP','Bahan Medis Habis Pakai',1,'2026-01-14 05:09:49',0,NULL),(7,'CAT7BFE','Infusion Set Advance Safety TP','Alat Kesehatan',1,'2026-01-15 04:23:58',1,'2026-01-15 04:30:36'),(8,'CATNFAA','Alat Kesehatan','Alat-alat kesehatan',1,'2026-01-15 04:31:23',0,NULL),(9,'CAT85K9','Reagen','Bahan-bahan kimia, hematology, laboratorium',1,'2026-01-19 04:47:06',0,NULL),(10,'CATTPH8','Stik/strip Test','Stik/strip test',1,'2026-01-19 04:49:04',0,NULL),(11,'CAT6A0C','Dental','Alat dan Bahan Dental/Gigi',1,'2026-01-19 04:49:40',0,NULL),(12,'CATRCD4','Elektronik','',1,'2026-01-30 02:45:59',0,NULL),(13,'CAT8TD7','ATK','Alat Tulis Kantor',1,'2026-02-11 08:19:34',0,NULL);
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `client_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `status` enum('active','completed','on_hold','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (2,'PROJ-2026-001','ALKES','PROJECTS ALKES ','RSUD/Puskesmas','2026-01-01','2026-12-31',NULL,'active',0,NULL,'2026-01-06 00:07:29','2026-01-08 16:00:46','COMP5K355D'),(3,'PROJ-2026-002','Woods ','Project Kayu','Trading Kayu','2026-01-01','2026-12-31',NULL,'active',0,NULL,'2026-01-12 07:15:58','2026-01-12 07:15:58','COMP5K355D'),(4,'PROJ-2026-003','Office W27','Keperluan Operasional Kantor','Ops Kantor ','2026-01-01','2026-12-31',NULL,'active',0,NULL,'2026-01-12 08:02:54','2026-01-19 07:12:01','COMP5K355D'),(5,'PROJ-2026-004','Cafe Lodok','Cafe Lodok','Cafe Lodok di Bandara','2026-01-01','2026-12-31',NULL,'active',0,NULL,'2026-01-12 09:26:29','2026-01-12 09:26:29','COMPA289QG'),(6,'PROJ-2026-005','ASABRI','Public Cloud - Software','PT. Era Awan Digital','2026-01-05','2026-02-04',2037960.00,'active',0,NULL,'2026-01-28 04:25:36','2026-01-28 04:25:36','COMPWE16GP');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_code` (`user_code`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (10,'USR007','ega','ega@mp.com','$2b$12$eSoj81X1rrbquy6WqNVv1epEgITHvmjfEf7tM2uXL9bZPzaA8ROTO','Admin ','Admin','active','2026-05-22 07:08:49',0,NULL,'2026-01-05 14:26:03','2026-05-22 07:08:49','ADM001','USR002',NULL),(11,'USR001','Herwi','herwi@mp.com','$2a$12$TQP4402rPFAOSxJvXJzos.BZXXfY2I/oz.kfETRyRYXIYItUaAbSi','Finance','Direktur','active','2026-06-08 03:22:34',0,NULL,'2026-01-05 15:10:53','2026-06-08 03:22:34','ADM001','USR001',NULL),(12,'USR002','Rifqi','rifqi@company.com','$2a$12$TQP4402rPFAOSxJvXJzos.BZXXfY2I/oz.kfETRyRYXIYItUaAbSi','Finance','Manager','active','2026-05-22 04:59:54',0,NULL,'2026-01-05 15:11:32','2026-05-22 04:59:54','ADM001','USR001',NULL),(14,'USR003','Agus','agus@company.com','$2a$12$TQP4402rPFAOSxJvXJzos.BZXXfY2I/oz.kfETRyRYXIYItUaAbSi','Manager Sales','Manager','active','2026-05-21 04:55:01',0,NULL,'2026-01-05 15:12:06','2026-05-21 04:55:01','ADM001','USR002',NULL),(15,'USR004','Danis','danis@company.com','$2a$12$TQP4402rPFAOSxJvXJzos.BZXXfY2I/oz.kfETRyRYXIYItUaAbSi','Purchasing','Staff','active','2026-05-22 03:38:50',0,NULL,'2026-01-05 15:12:29','2026-05-22 03:38:50','ADM001','USR001',NULL),(17,'USR005','Milen','milen@company.com','$2a$12$TQP4402rPFAOSxJvXJzos.BZXXfY2I/oz.kfETRyRYXIYItUaAbSi','Finance Accounting and Tax','Finance','active','2026-05-22 03:43:16',0,NULL,'2026-01-05 15:13:16','2026-05-22 03:43:16','ADM001','USR001',NULL),(18,'USER-2026-0007','Syifa','syifa@gmail.com','$2b$12$/cqiy8PYbK9eo7s1u8Ab.eEJ5aVsvPIby/sADQ/7c24UmIkarZ/E6','Sales','Sales','active','2026-05-18 03:01:43',0,NULL,'2026-01-10 09:04:50','2026-05-18 03:01:43','USR001','USR002',NULL),(19,'USER-2026-0008','Alvin','alvin@mp.com','$2b$12$TJnmh70FstDShV.KYjPxJubXrqz9iM2wNGUU4YI0dvNfZL.QrMOY2','Finance','AR','active','2026-05-22 05:55:29',0,NULL,'2026-01-19 06:39:25','2026-05-22 05:55:29','USR002','USR002',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_system_role` tinyint(1) DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_code` (`role_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ROLE-2026-0001','Purchasing','Akses Untuk Mengelola Purchase Oder ',0,0,NULL,'2026-01-12 18:41:22','USR001','2026-02-05 09:22:55','USR002',NULL),(2,'ROLE-2026-0002','Sales Admin','Akses untuk sales admin ( membantu dokumentasi sales )',0,0,NULL,'2026-01-12 18:43:28','USR001','2026-01-22 15:02:47','USR002',NULL),(3,'ROLE-2026-0003','Sales','Akses untuk Sales membuat dokumentasi',0,0,NULL,'2026-01-12 18:44:54','USR001','2026-01-22 14:51:04','USR002',NULL),(4,'ROLE-2026-0004','Sales Manager','Akses Untuk manager Sales',0,0,NULL,'2026-01-12 18:46:14','USR001','2026-01-22 14:59:18','USR002',NULL),(5,'ROLE-2026-0005','Shipping Admin','Akses Untuk Mengelola proses Delivery Order (DO) di sistem',0,0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(6,'ROLE-2026-0006','Finance','Akses Untuk kelola keuangan atau approval uang keluar.',0,0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(7,'ROLE-2026-0007','Manager Finance & Akuntan','Untuk akses Manager Finance & Akuntan',0,0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(8,'ROLE-2026-0008','Account Receivable','AR',0,0,NULL,'2026-01-22 05:44:49','USR002','2026-04-21 09:04:51','USR002',NULL),(9,'ROLE-2026-0009','Only Approval for danis','Only Approval for danis',0,0,NULL,'2026-01-29 16:08:10','USR001','2026-01-29 16:08:10',NULL,NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` enum('transactions','cash_advance','reimburse','projects','settings','reports','delivery','accounting') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('create','view','update','delete','approve','approve_spv','approve_finance','pay','reconcile','manage','post_journal','close_period') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_code` (`permission_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (82,'DASHBOARD_VIEW','View Dashboard','Akses untuk melihat dashboard utama','reports','dashboard','view',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(83,'TRANSACTIONS_VIEW','View Transactions Menu','Akses untuk melihat menu Transactions','transactions','transactions','view',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(84,'SALES_ORDER_CREATE','Create Sales Order','Akses untuk membuat Sales Order','transactions','sales_order','create',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(85,'PURCHASE_ORDER_CREATE','Create Purchase Order','Akses untuk membuat Purchase Order','transactions','purchase_order','create',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(86,'PURCHASE_ORDER_APPROVE','Approve Purchase Order','Akses untuk menyetujui Purchase Order','transactions','purchase_order','approve',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(87,'DELIVERY_ORDER_CREATE','Create Delivery Order','Akses untuk membuat Delivery Order','delivery','delivery_order','create',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(88,'INVOICE_CREATE','Create Invoice','Akses untuk membuat Invoice & Payment','transactions','invoice','create',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(89,'CASH_ADVANCE_VIEW','View Cash Advance Menu','Akses untuk melihat menu Cash Advance','cash_advance','cash_advance','view',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(90,'CASH_ADVANCE_CREATE','Create Cash Advance','Akses untuk membuat Cash Advance','cash_advance','cash_advance','create',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(91,'CASH_ADVANCE_TRANSACTION_CREATE','Create Cash Advance Transaction','Akses untuk membuat transaksi Cash Advance','cash_advance','cash_advance_transaction','create',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(92,'CASH_ADVANCE_APPROVE','Approve Cash Advance','Akses untuk menyetujui Cash Advance','cash_advance','cash_advance','approve',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(93,'CASH_ADVANCE_REFUND','Refund Cash Advance','Akses untuk refund Cash Advance','cash_advance','cash_advance','update',0,NULL,'2026-01-12 18:21:59','2026-01-12 18:21:59',NULL,NULL,'system'),(94,'REIMBURSEMENT_VIEW','View Reimbursement Menu','Akses untuk melihat menu Reimbursement','reimburse','reimbursement','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(95,'REIMBURSEMENT_CREATE','Create Reimbursement','Akses untuk membuat Reimbursement','reimburse','reimbursement','create',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(96,'REIMBURSEMENT_APPROVE','Approve Reimbursement','Akses untuk menyetujui Reimbursement','reimburse','reimbursement','approve',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(97,'ACCOUNTING_REPORT_VIEW','View Accounting Menu','Akses untuk melihat menu Accounting','accounting','accounting_report','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(98,'CASH_BANK_REPORT_VIEW','View Cash & Bank Report','Akses untuk melihat laporan Kas & Bank','reports','cash_bank_report','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(99,'BANK_RECONCILIATION_VIEW','View Bank Reconciliation','Akses untuk melihat rekonsiliasi bank','accounting','bank_reconciliation','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(100,'MANUAL_JOURNAL_VIEW','View Manual Journal','Akses untuk melihat jurnal manual','accounting','manual_journal','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(101,'COMPANY_SETUP_VIEW','View Company Setup Menu','Akses untuk melihat menu Company Setup','settings','company_setup','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(102,'COMPANY_VIEW','View Companies','Akses untuk melihat data perusahaan','settings','company','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(103,'CUSTOMER_SETUP_VIEW','View Customer Setup Menu','Akses untuk melihat menu Customer Setup','settings','customer_setup','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(104,'CUSTOMER_VIEW','View Customers','Akses untuk melihat data customer','settings','customer','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(105,'SUPPLIER_SETUP_VIEW','View Supplier Setup Menu','Akses untuk melihat menu Supplier Setup','settings','supplier_setup','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(106,'SUPPLIER_VIEW','View Suppliers','Akses untuk melihat data supplier','settings','supplier','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(107,'PRODUCT_SETUP_VIEW','View Product Setup Menu','Akses untuk melihat menu Products','settings','product_setup','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(108,'PRODUCT_VIEW','View Products','Akses untuk melihat data produk','settings','product','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(109,'PRODUCT_CATEGORY_VIEW','View Product Categories','Akses untuk melihat kategori produk','settings','product_category','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(110,'ACCOUNTING_SETUP_VIEW','View Accounting Setup Menu','Akses untuk melihat menu Accounting Setup','settings','accounting_setup','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(111,'BANK_ACCOUNT_VIEW','View Bank Accounts','Akses untuk melihat data rekening bank','settings','bank_account','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(112,'TAX_VIEW','View Taxes','Akses untuk melihat data pajak','settings','tax','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(113,'CHART_OF_ACCOUNT_VIEW','View Chart of Accounts','Akses untuk melihat chart of account','settings','chart_of_account','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(114,'ACCOUNT_MAPPING_VIEW','View Account Mapping','Akses untuk melihat mapping akun','settings','account_mapping','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(115,'SYSTEM_SETTINGS_VIEW','View System Settings Menu','Akses untuk melihat menu System Settings','settings','system_settings','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(116,'ROLE_MANAGEMENT_VIEW','View Role Management','Akses untuk melihat management role (RBAC)','settings','role_management','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(117,'PROJECT_VIEW','View Projects','Akses untuk melihat data proyek','projects','project','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(118,'REIMBURSEMENT_CATEGORY_VIEW','View Reimbursement Categories','Akses untuk melihat kategori reimbursement','settings','reimbursement_category','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system'),(119,'NUMBERING_SEQUENCE_VIEW','View Numbering Sequences','Akses untuk melihat setting format nomor','settings','numbering_sequence','view',0,NULL,'2026-01-12 18:22:00','2026-01-12 18:22:00',NULL,NULL,'system');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_code` (`role_permission_code`),
  UNIQUE KEY `unique_role_permission` (`role_code`,`permission_code`)
) ENGINE=InnoDB AUTO_INCREMENT=405 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (153,'ADMIN_DASHBOARD_VIEW','ADMIN','DASHBOARD_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(154,'ADMIN_TRANSACTIONS_VIEW','ADMIN','TRANSACTIONS_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(155,'ADMIN_SALES_ORDER_CREATE','ADMIN','SALES_ORDER_CREATE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(156,'ADMIN_PURCHASE_ORDER_CREATE','ADMIN','PURCHASE_ORDER_CREATE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(157,'ADMIN_PURCHASE_ORDER_APPROVE','ADMIN','PURCHASE_ORDER_APPROVE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(158,'ADMIN_DELIVERY_ORDER_CREATE','ADMIN','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(159,'ADMIN_INVOICE_CREATE','ADMIN','INVOICE_CREATE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(160,'ADMIN_CASH_ADVANCE_VIEW','ADMIN','CASH_ADVANCE_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(161,'ADMIN_CASH_ADVANCE_CREATE','ADMIN','CASH_ADVANCE_CREATE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(162,'ADMIN_CASH_ADVANCE_TRANSACTION_CREATE','ADMIN','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(163,'ADMIN_CASH_ADVANCE_APPROVE','ADMIN','CASH_ADVANCE_APPROVE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(164,'ADMIN_CASH_ADVANCE_REFUND','ADMIN','CASH_ADVANCE_REFUND',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(165,'ADMIN_REIMBURSEMENT_VIEW','ADMIN','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(166,'ADMIN_REIMBURSEMENT_CREATE','ADMIN','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(167,'ADMIN_REIMBURSEMENT_APPROVE','ADMIN','REIMBURSEMENT_APPROVE',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(168,'ADMIN_ACCOUNTING_REPORT_VIEW','ADMIN','ACCOUNTING_REPORT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(169,'ADMIN_CASH_BANK_REPORT_VIEW','ADMIN','CASH_BANK_REPORT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(170,'ADMIN_BANK_RECONCILIATION_VIEW','ADMIN','BANK_RECONCILIATION_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(171,'ADMIN_MANUAL_JOURNAL_VIEW','ADMIN','MANUAL_JOURNAL_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(172,'ADMIN_COMPANY_SETUP_VIEW','ADMIN','COMPANY_SETUP_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(173,'ADMIN_COMPANY_VIEW','ADMIN','COMPANY_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(174,'ADMIN_CUSTOMER_SETUP_VIEW','ADMIN','CUSTOMER_SETUP_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(175,'ADMIN_CUSTOMER_VIEW','ADMIN','CUSTOMER_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(176,'ADMIN_SUPPLIER_SETUP_VIEW','ADMIN','SUPPLIER_SETUP_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(177,'ADMIN_SUPPLIER_VIEW','ADMIN','SUPPLIER_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(178,'ADMIN_PRODUCT_SETUP_VIEW','ADMIN','PRODUCT_SETUP_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(179,'ADMIN_PRODUCT_VIEW','ADMIN','PRODUCT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(180,'ADMIN_PRODUCT_CATEGORY_VIEW','ADMIN','PRODUCT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(181,'ADMIN_ACCOUNTING_SETUP_VIEW','ADMIN','ACCOUNTING_SETUP_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(182,'ADMIN_BANK_ACCOUNT_VIEW','ADMIN','BANK_ACCOUNT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(183,'ADMIN_TAX_VIEW','ADMIN','TAX_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(184,'ADMIN_CHART_OF_ACCOUNT_VIEW','ADMIN','CHART_OF_ACCOUNT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(185,'ADMIN_ACCOUNT_MAPPING_VIEW','ADMIN','ACCOUNT_MAPPING_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(186,'ADMIN_SYSTEM_SETTINGS_VIEW','ADMIN','SYSTEM_SETTINGS_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(187,'ADMIN_ROLE_MANAGEMENT_VIEW','ADMIN','ROLE_MANAGEMENT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(188,'ADMIN_PROJECT_VIEW','ADMIN','PROJECT_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(189,'ADMIN_REIMBURSEMENT_CATEGORY_VIEW','ADMIN','REIMBURSEMENT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(190,'ADMIN_NUMBERING_SEQUENCE_VIEW','ADMIN','NUMBERING_SEQUENCE_VIEW',0,NULL,'2026-01-12 18:22:00','system','2026-01-12 18:22:00',NULL,NULL),(216,'RP-1768243282084-6nmgcrgl2','ROLE-2026-0001','PURCHASE_ORDER_CREATE',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(217,'RP-1768243282087-qvwdktooq','ROLE-2026-0001','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(218,'RP-1768243282090-7sf081yd8','ROLE-2026-0001','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(219,'RP-1768243282108-juwbl9i52','ROLE-2026-0001','PRODUCT_VIEW',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(220,'RP-1768243282110-1rz2utl04','ROLE-2026-0001','PRODUCT_SETUP_VIEW',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(221,'RP-1768243282113-nl9dm947v','ROLE-2026-0001','PRODUCT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(222,'RP-1768243282117-il0ajmgzo','ROLE-2026-0001','SUPPLIER_VIEW',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(223,'RP-1768243282120-6up60srd6','ROLE-2026-0001','SUPPLIER_SETUP_VIEW',0,NULL,'2026-01-12 18:41:22','USR001','2026-01-12 18:41:22',NULL,NULL),(224,'RP-1768243408328-2uoe17m3e','ROLE-2026-0002','INVOICE_CREATE',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(225,'RP-1768243408331-2iyqot7ot','ROLE-2026-0002','SALES_ORDER_CREATE',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(226,'RP-1768243408332-cj9gp26an','ROLE-2026-0002','TRANSACTIONS_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(227,'RP-1768243408335-uqpc7qcj2','ROLE-2026-0002','CASH_ADVANCE_CREATE',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(228,'RP-1768243408336-8s94tpktl','ROLE-2026-0002','CASH_ADVANCE_REFUND',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(229,'RP-1768243408339-mld8ry24p','ROLE-2026-0002','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(230,'RP-1768243408409-qr8feu3pn','ROLE-2026-0002','CASH_ADVANCE_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(231,'RP-1768243408412-gio54ps1r','ROLE-2026-0002','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(232,'RP-1768243408414-51e04fwnz','ROLE-2026-0002','REIMBURSEMENT_APPROVE',1,'2026-01-22 14:54:01','2026-01-12 18:43:28','USR001','2026-01-22 14:54:01','USR002','USR002'),(233,'RP-1768243408416-2ihnj0jsd','ROLE-2026-0002','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(234,'RP-1768243408418-aso3mm847','ROLE-2026-0002','CUSTOMER_SETUP_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(235,'RP-1768243408420-np75jbhio','ROLE-2026-0002','CUSTOMER_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(236,'RP-1768243408509-phsbf1qrl','ROLE-2026-0002','PRODUCT_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(237,'RP-1768243408511-jfwes64fd','ROLE-2026-0002','PRODUCT_SETUP_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(238,'RP-1768243408513-684dtj1jv','ROLE-2026-0002','PRODUCT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:43:28','USR001','2026-01-12 18:43:28',NULL,NULL),(239,'RP-1768243494517-0m3cqll8u','ROLE-2026-0003','INVOICE_CREATE',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(240,'RP-1768243494519-0es7ttkwm','ROLE-2026-0003','SALES_ORDER_CREATE',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(241,'RP-1768243494521-6yoz37ps9','ROLE-2026-0003','TRANSACTIONS_VIEW',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(242,'RP-1768243494523-3d4gh8cbl','ROLE-2026-0003','CASH_ADVANCE_CREATE',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(243,'RP-1768243494526-ntxsl2di0','ROLE-2026-0003','CASH_ADVANCE_REFUND',1,'2026-01-22 14:51:04','2026-01-12 18:44:54','USR001','2026-01-22 14:51:04','USR002','USR002'),(244,'RP-1768243494609-21zxwidel','ROLE-2026-0003','CASH_ADVANCE_TRANSACTION_CREATE',1,'2026-01-22 14:51:04','2026-01-12 18:44:54','USR001','2026-01-22 14:51:04','USR002','USR002'),(245,'RP-1768243494611-78t055agt','ROLE-2026-0003','CASH_ADVANCE_VIEW',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(246,'RP-1768243494613-xcc84sd88','ROLE-2026-0003','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(247,'RP-1768243494615-5mhns48ht','ROLE-2026-0003','REIMBURSEMENT_APPROVE',1,'2026-01-22 14:51:04','2026-01-12 18:44:54','USR001','2026-01-22 14:51:04','USR002','USR002'),(248,'RP-1768243494617-i7gdct8ml','ROLE-2026-0003','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(249,'RP-1768243494619-74p3xrd5h','ROLE-2026-0003','PROJECT_VIEW',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(250,'RP-1768243494621-45fprs9mf','ROLE-2026-0003','REIMBURSEMENT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(251,'RP-1768243494623-oip8644zm','ROLE-2026-0003','SYSTEM_SETTINGS_VIEW',0,NULL,'2026-01-12 18:44:54','USR001','2026-01-12 18:44:54',NULL,NULL),(252,'RP-1768243574913-n95temei0','ROLE-2026-0004','INVOICE_CREATE',0,NULL,'2026-01-12 18:46:14','USR001','2026-01-12 18:46:14',NULL,NULL),(253,'RP-1768243574916-9ljsl3qzq','ROLE-2026-0004','PURCHASE_ORDER_APPROVE',0,NULL,'2026-01-12 18:46:14','USR001','2026-01-12 18:46:14',NULL,NULL),(254,'RP-1768243574918-mv21qkyli','ROLE-2026-0004','TRANSACTIONS_VIEW',0,NULL,'2026-01-12 18:46:14','USR001','2026-01-12 18:46:14',NULL,NULL),(255,'RP-1768243575015-ue3kxb8go','ROLE-2026-0004','PURCHASE_ORDER_CREATE',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(256,'RP-1768243575018-vebtk94m3','ROLE-2026-0004','SALES_ORDER_CREATE',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(257,'RP-1768243575020-fet4gopq3','ROLE-2026-0004','CASH_ADVANCE_CREATE',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(258,'RP-1768243575107-92vkleoa6','ROLE-2026-0004','CASH_ADVANCE_REFUND',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(259,'RP-1768243575110-p79t3xwyz','ROLE-2026-0004','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(260,'RP-1768243575112-i28tz0h3b','ROLE-2026-0004','CASH_ADVANCE_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(261,'RP-1768243575115-2d99nfppo','ROLE-2026-0004','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(262,'RP-1768243575117-dde5ttx54','ROLE-2026-0004','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(263,'RP-1768243575119-ssx8swijh','ROLE-2026-0004','REIMBURSEMENT_APPROVE',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(264,'RP-1768243575122-og6mu76xz','ROLE-2026-0004','PROJECT_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(265,'RP-1768243575123-fgnc2twou','ROLE-2026-0004','COMPANY_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(266,'RP-1768243575207-985606em9','ROLE-2026-0004','CUSTOMER_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(267,'RP-1768243575210-lptb547ov','ROLE-2026-0004','NUMBERING_SEQUENCE_VIEW',1,'2026-01-22 14:59:18','2026-01-12 18:46:15','USR001','2026-01-22 14:59:18','USR002','USR002'),(268,'RP-1768243575212-ruluynw8w','ROLE-2026-0004','PRODUCT_CATEGORY_VIEW',1,'2026-01-22 14:59:18','2026-01-12 18:46:15','USR001','2026-01-22 14:59:18','USR002','USR002'),(269,'RP-1768243575215-e79brkwgp','ROLE-2026-0004','REIMBURSEMENT_CATEGORY_VIEW',1,'2026-01-22 14:59:18','2026-01-12 18:46:15','USR001','2026-01-22 14:59:18','USR002','USR002'),(270,'RP-1768243575217-p8j48m4z3','ROLE-2026-0004','SUPPLIER_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(271,'RP-1768243575219-ci2osrifu','ROLE-2026-0004','SYSTEM_SETTINGS_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(272,'RP-1768243575221-ha6v6r06q','ROLE-2026-0004','COMPANY_SETUP_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(273,'RP-1768243575308-cgfjs4rl6','ROLE-2026-0004','CUSTOMER_SETUP_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(274,'RP-1768243575311-fc1vt97mh','ROLE-2026-0004','PRODUCT_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(275,'RP-1768243575314-6oq8i0m21','ROLE-2026-0004','PRODUCT_SETUP_VIEW',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(276,'RP-1768243575316-km4icj74s','ROLE-2026-0004','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-12 18:46:15','USR001','2026-01-12 18:46:15',NULL,NULL),(277,'RP-1768243855517-6m5djatnf','ROLE-2026-0005','TRANSACTIONS_VIEW',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(278,'RP-1768243855414-khq68zzoz','ROLE-2026-0005','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(279,'RP-1768243855384-of47xhv9c','ROLE-2026-0005','CASH_ADVANCE_CREATE',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(280,'RP-1768243855406-zla1r87b1','ROLE-2026-0005','CASH_ADVANCE_REFUND',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(281,'RP-1768243855409-4cbtdc9v5','ROLE-2026-0005','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(282,'RP-1768243855412-yzk4r661l','ROLE-2026-0005','CASH_ADVANCE_VIEW',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(283,'RP-1768243855509-blpi5usnc','ROLE-2026-0005','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(284,'RP-1768243855420-mn2cuew57','ROLE-2026-0005','REIMBURSEMENT_APPROVE',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(285,'RP-1768243855511-0k75duhc3','ROLE-2026-0005','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(286,'RP-1768243855506-42thk4pvg','ROLE-2026-0005','REIMBURSEMENT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(287,'RP-1768243855514-1u56yggxg','ROLE-2026-0005','SYSTEM_SETTINGS_VIEW',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(288,'RP-1768243855417-0ha9jrmho','ROLE-2026-0005','INVOICE_CREATE',0,NULL,'2026-01-12 18:49:42','USR001','2026-01-12 18:50:55','USR001',NULL),(289,'RP-1768243991617-1x8b07qns','ROLE-2026-0006','PURCHASE_ORDER_APPROVE',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(290,'RP-1768243991620-xcik6sp9o','ROLE-2026-0006','TRANSACTIONS_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(291,'RP-1768243991623-l3jdqbwjz','ROLE-2026-0006','CASH_ADVANCE_APPROVE',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(292,'RP-1768243991707-l7soul2ov','ROLE-2026-0006','CASH_ADVANCE_CREATE',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(293,'RP-1768243991710-2es7o2099','ROLE-2026-0006','CASH_ADVANCE_REFUND',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(294,'RP-1768243991712-38n5m3o8r','ROLE-2026-0006','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(295,'RP-1768243991714-chgiv00dy','ROLE-2026-0006','CASH_ADVANCE_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(296,'RP-1768243991716-y9j317143','ROLE-2026-0006','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(297,'RP-1768243991717-24tt8abmx','ROLE-2026-0006','REIMBURSEMENT_APPROVE',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(298,'RP-1768243991719-fj1uw9qib','ROLE-2026-0006','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(299,'RP-1768243991720-uo4099d5d','ROLE-2026-0006','BANK_ACCOUNT_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(300,'RP-1768243991722-a3v8nze2b','ROLE-2026-0006','ACCOUNT_MAPPING_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(301,'RP-1768243991724-b9ji5i0pr','ROLE-2026-0006','COMPANY_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(302,'RP-1768243991726-03xuksr6n','ROLE-2026-0006','CUSTOMER_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(303,'RP-1768243991806-vkpw41u0h','ROLE-2026-0006','NUMBERING_SEQUENCE_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(304,'RP-1768243991808-x4voh4r29','ROLE-2026-0006','PRODUCT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(305,'RP-1768243991810-n6jxmmbic','ROLE-2026-0006','TAX_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(306,'RP-1768243991812-z5o0lpyov','ROLE-2026-0006','SUPPLIER_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(307,'RP-1768243991814-64m2kg6w2','ROLE-2026-0006','REIMBURSEMENT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(308,'RP-1768243991817-5mx1elmi2','ROLE-2026-0006','SYSTEM_SETTINGS_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(309,'RP-1768243991820-3aus5enwj','ROLE-2026-0006','ACCOUNTING_SETUP_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(310,'RP-1768243991822-8h28iqijc','ROLE-2026-0006','CHART_OF_ACCOUNT_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(311,'RP-1768243991906-j6esbjhup','ROLE-2026-0006','COMPANY_SETUP_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(312,'RP-1768243991908-rmfk9zvl5','ROLE-2026-0006','CUSTOMER_SETUP_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(313,'RP-1768243991910-l7z3altvw','ROLE-2026-0006','PRODUCT_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(314,'RP-1768243991911-gvpi4yqy0','ROLE-2026-0006','PRODUCT_SETUP_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(315,'RP-1768243991913-tfx0ylom9','ROLE-2026-0006','SUPPLIER_SETUP_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(316,'RP-1768243991915-s5wxxzt1f','ROLE-2026-0006','CASH_BANK_REPORT_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(317,'RP-1768243991916-z8q4id51c','ROLE-2026-0006','DASHBOARD_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(318,'RP-1768243991918-pxgbri0d6','ROLE-2026-0006','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(319,'RP-1768243991920-8zdylpcrn','ROLE-2026-0006','ACCOUNTING_REPORT_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(320,'RP-1768243991922-1kmzasjq1','ROLE-2026-0006','MANUAL_JOURNAL_VIEW',0,NULL,'2026-01-12 18:53:11','USR001','2026-01-12 18:53:11',NULL,NULL),(321,'RP-1768243992007-n05luummx','ROLE-2026-0006','BANK_RECONCILIATION_VIEW',0,NULL,'2026-01-12 18:53:12','USR001','2026-01-12 18:53:12',NULL,NULL),(322,'RP-1768244080526-29je5yku9','ROLE-2026-0007','INVOICE_CREATE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(323,'RP-1768244080528-2ep7llnrg','ROLE-2026-0007','TRANSACTIONS_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(324,'RP-1768244080530-ary04opyq','ROLE-2026-0007','PURCHASE_ORDER_APPROVE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(325,'RP-1768244080532-79v96etkq','ROLE-2026-0007','PURCHASE_ORDER_CREATE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(326,'RP-1768244080534-t43u907bg','ROLE-2026-0007','SALES_ORDER_CREATE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(327,'RP-1768244080536-ylyxofldf','ROLE-2026-0007','CASH_ADVANCE_CREATE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(328,'RP-1768244080606-2vtwt3cke','ROLE-2026-0007','CASH_ADVANCE_REFUND',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(329,'RP-1768244080609-dftc5j849','ROLE-2026-0007','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(330,'RP-1768244080610-o5llw7x6a','ROLE-2026-0007','CASH_ADVANCE_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(331,'RP-1768244080612-zz0orwrg2','ROLE-2026-0007','CASH_ADVANCE_APPROVE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(332,'RP-1768244080618-qrf3u9qx0','ROLE-2026-0007','REIMBURSEMENT_CREATE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(333,'RP-1768244080620-mlqtg7a2b','ROLE-2026-0007','REIMBURSEMENT_APPROVE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(334,'RP-1768244080622-rqj15dnlf','ROLE-2026-0007','REIMBURSEMENT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(335,'RP-1768244080623-a417jmhm7','ROLE-2026-0007','PROJECT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(336,'RP-1768244080705-h1xpekdip','ROLE-2026-0007','ACCOUNT_MAPPING_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(337,'RP-1768244080708-j4etm620r','ROLE-2026-0007','BANK_ACCOUNT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(338,'RP-1768244080710-jarfg2s45','ROLE-2026-0007','COMPANY_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(339,'RP-1768244080712-t1qnqlmhv','ROLE-2026-0007','CUSTOMER_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(340,'RP-1768244080718-3j2703det','ROLE-2026-0007','NUMBERING_SEQUENCE_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(341,'RP-1768244080721-qp0ifamlt','ROLE-2026-0007','ACCOUNTING_SETUP_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(342,'RP-1768244080807-74l4kstk1','ROLE-2026-0007','CHART_OF_ACCOUNT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(343,'RP-1768244080810-vxqqhv2df','ROLE-2026-0007','COMPANY_SETUP_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(344,'RP-1768244080812-37hek7fyc','ROLE-2026-0007','CUSTOMER_SETUP_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(345,'RP-1768244080813-hvauu9e6q','ROLE-2026-0007','PRODUCT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(346,'RP-1768244080816-llnb3ht6a','ROLE-2026-0007','PRODUCT_SETUP_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(347,'RP-1768244080818-p4pm3wd18','ROLE-2026-0007','ROLE_MANAGEMENT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(348,'RP-1768244080819-mwc4gpp0b','ROLE-2026-0007','SUPPLIER_SETUP_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(349,'RP-1768244080821-dvzg4q83t','ROLE-2026-0007','TAX_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(350,'RP-1768244080823-2xgdwvbb6','ROLE-2026-0007','PRODUCT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(351,'RP-1768244080907-stxt4q4fv','ROLE-2026-0007','REIMBURSEMENT_CATEGORY_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(352,'RP-1768244080909-nd2vj39v5','ROLE-2026-0007','SUPPLIER_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(353,'RP-1768244080911-jtam0vgoc','ROLE-2026-0007','SYSTEM_SETTINGS_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(354,'RP-1768244080913-i4a8zuth2','ROLE-2026-0007','CASH_BANK_REPORT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(355,'RP-1768244080914-4rj9kngmt','ROLE-2026-0007','DASHBOARD_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(356,'RP-1768244080916-36qh979qn','ROLE-2026-0007','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(357,'RP-1768244080918-318wim7vg','ROLE-2026-0007','ACCOUNTING_REPORT_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(358,'RP-1768244080919-wz08nw1wi','ROLE-2026-0007','MANUAL_JOURNAL_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(359,'RP-1768244080921-inudjs5xo','ROLE-2026-0007','BANK_RECONCILIATION_VIEW',0,NULL,'2026-01-12 18:54:40','USR001','2026-01-12 18:54:40',NULL,NULL),(360,'RP-1769060689740-19540-kww3koyy9','ROLE-2026-0008','TRANSACTIONS_VIEW',0,NULL,'2026-01-22 05:44:49','USR002','2026-01-22 05:44:49',NULL,NULL),(361,'RP-1769060689742-19540-76xhqw8zm','ROLE-2026-0008','PROJECT_VIEW',0,NULL,'2026-01-22 05:44:49','USR002','2026-01-22 05:44:49',NULL,NULL),(362,'RP-1769060689743-19540-2c6uemi8k','ROLE-2026-0008','SYSTEM_SETTINGS_VIEW',0,NULL,'2026-01-22 05:44:49','USR002','2026-01-22 05:44:49',NULL,NULL),(363,'RP-1769060689743-19540-omsmd2yen','ROLE-2026-0008','SUPPLIER_VIEW',0,NULL,'2026-01-22 05:44:49','USR002','2026-01-22 05:44:49',NULL,NULL),(364,'RP-1769060689744-19540-c893ifxv6','ROLE-2026-0008','PRODUCT_VIEW',0,NULL,'2026-01-22 05:44:49','USR002','2026-01-22 05:44:49',NULL,NULL),(365,'RP-1769060689744-19540-7fn5ky1p0','ROLE-2026-0008','CUSTOMER_SETUP_VIEW',0,NULL,'2026-01-22 05:44:49','USR002','2026-01-22 05:44:49',NULL,NULL),(366,'RP-1769092356609-27704-wl3tgyv95','ROLE-2026-0008','INVOICE_CREATE',0,NULL,'2026-01-22 14:32:36','USR002','2026-01-22 14:32:36',NULL,NULL),(367,'RP-1769092356613-27704-a5rxumib9','ROLE-2026-0008','SALES_ORDER_CREATE',0,NULL,'2026-01-22 14:32:36','USR002','2026-01-22 14:32:36',NULL,NULL),(368,'RP-1769092356614-27704-sv4wm1bqm','ROLE-2026-0008','PURCHASE_ORDER_CREATE',0,NULL,'2026-01-22 14:32:36','USR002','2026-01-22 14:32:36',NULL,NULL),(369,'RP-1769092356614-27704-qsll896td','ROLE-2026-0008','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-22 14:32:36','USR002','2026-01-22 14:32:36',NULL,NULL),(370,'RP-1769092512540-27704-g4ku7phm4','ROLE-2026-0008','SUPPLIER_SETUP_VIEW',0,NULL,'2026-01-22 14:35:12','USR002','2026-01-22 14:35:12',NULL,NULL),(371,'RP-1769092712523-27704-y9ze721w7','ROLE-2026-0008','PRODUCT_CATEGORY_VIEW',0,NULL,'2026-01-22 14:38:32','USR002','2026-01-22 14:38:32',NULL,NULL),(372,'RP-1769092712524-27704-kh7itkrym','ROLE-2026-0008','CUSTOMER_VIEW',0,NULL,'2026-01-22 14:38:32','USR002','2026-01-22 14:38:32',NULL,NULL),(373,'RP-1769093257284-27704-0hxv5tjoo','ROLE-2026-0001','INVOICE_CREATE',0,NULL,'2026-01-22 14:47:37','USR002','2026-01-22 14:47:37',NULL,NULL),(374,'RP-1769093257285-27704-vrboarppt','ROLE-2026-0001','TRANSACTIONS_VIEW',0,NULL,'2026-01-22 14:47:37','USR002','2026-01-22 14:47:37',NULL,NULL),(375,'RP-1769093257286-27704-ur259je82','ROLE-2026-0001','CASH_ADVANCE_CREATE',0,NULL,'2026-01-22 14:47:37','USR002','2026-01-22 14:47:37',NULL,NULL),(376,'RP-1769093257286-27704-sd46zg4cb','ROLE-2026-0001','CASH_ADVANCE_VIEW',0,NULL,'2026-01-22 14:47:37','USR002','2026-01-22 14:47:37',NULL,NULL),(377,'RP-1769093257287-27704-a8scje9vu','ROLE-2026-0001','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-01-22 14:47:37','USR002','2026-01-22 14:47:37',NULL,NULL),(378,'RP-1769093257287-27704-8zeu380ga','ROLE-2026-0001','PROJECT_VIEW',0,NULL,'2026-01-22 14:47:37','USR002','2026-01-22 14:47:37',NULL,NULL),(379,'RP-1769093257288-27704-00ega2s4j','ROLE-2026-0001','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-22 14:47:37','USR002','2026-01-22 14:47:37',NULL,NULL),(380,'RP-1769093598922-27704-cei6qcr47','ROLE-2026-0002','PROJECT_VIEW',0,NULL,'2026-01-22 14:53:18','USR002','2026-01-22 14:53:18',NULL,NULL),(381,'RP-1769093598923-27704-stei4zfa1','ROLE-2026-0002','DELIVERY_ORDER_CREATE',0,NULL,'2026-01-22 14:53:18','USR002','2026-01-22 14:53:18',NULL,NULL),(382,'RP-1769093980825-27704-uut8u63t1','ROLE-2026-0002','REIMBURSEMENT_CATEGORY_VIEW',0,NULL,'2026-01-22 14:59:40','USR002','2026-01-22 14:59:40',NULL,NULL),(383,'RP-1769094167717-27704-evflx6nyh','ROLE-2026-0002','SUPPLIER_SETUP_VIEW',0,NULL,'2026-01-22 15:02:47','USR002','2026-01-22 15:02:47',NULL,NULL),(384,'RP-1769094167718-27704-18hwawas6','ROLE-2026-0002','SUPPLIER_VIEW',0,NULL,'2026-01-22 15:02:47','USR002','2026-01-22 15:02:47',NULL,NULL),(385,'RP-1769094167719-27704-xetkphuao','ROLE-2026-0002','COMPANY_VIEW',0,NULL,'2026-01-22 15:02:47','USR002','2026-01-22 15:02:47',NULL,NULL),(386,'RP-1769702890363-114571-jevjqjgfn','ROLE-2026-0009','PURCHASE_ORDER_APPROVE',0,NULL,'2026-01-29 16:08:10','USR001','2026-01-29 16:08:10',NULL,NULL),(387,'RP-1770283375416-157597-j88q0sm1y','ROLE-2026-0001','REIMBURSEMENT_APPROVE',0,NULL,'2026-02-05 09:22:55','USR002','2026-02-05 09:22:55',NULL,NULL),(388,'RP-1770283375419-157597-664ci33ct','ROLE-2026-0001','CASH_ADVANCE_APPROVE',0,NULL,'2026-02-05 09:22:55','USR002','2026-02-05 09:22:55',NULL,NULL),(389,'RP-1776762291277-39027-jn3a1n6wa','ROLE-2026-0008','CASH_ADVANCE_CREATE',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(390,'RP-1776762291280-39027-qrw4h5wnc','ROLE-2026-0008','CASH_ADVANCE_REFUND',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(391,'RP-1776762291284-39027-g26r0c420','ROLE-2026-0008','CASH_ADVANCE_TRANSACTION_CREATE',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(392,'RP-1776762291285-39027-qobt0zs52','ROLE-2026-0008','CASH_ADVANCE_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(393,'RP-1776762291285-39027-8r1ypo4tt','ROLE-2026-0008','CASH_ADVANCE_APPROVE',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(394,'RP-1776762291286-39027-9c3p1itqj','ROLE-2026-0008','REIMBURSEMENT_CREATE',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(395,'RP-1776762291287-39027-4kynlplul','ROLE-2026-0008','REIMBURSEMENT_APPROVE',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(396,'RP-1776762291287-39027-s6b8kyl5q','ROLE-2026-0008','REIMBURSEMENT_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(397,'RP-1776762291288-39027-rzfzg35f5','ROLE-2026-0008','ACCOUNT_MAPPING_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(398,'RP-1776762291288-39027-mxm3k2y74','ROLE-2026-0008','BANK_ACCOUNT_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(399,'RP-1776762291289-39027-owrilbusr','ROLE-2026-0008','COMPANY_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(400,'RP-1776762291296-39027-73h99ll0u','ROLE-2026-0008','NUMBERING_SEQUENCE_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(401,'RP-1776762291297-39027-aa74hj3jh','ROLE-2026-0008','ACCOUNTING_SETUP_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(402,'RP-1776762291297-39027-t65ls6ygm','ROLE-2026-0008','CHART_OF_ACCOUNT_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(403,'RP-1776762291298-39027-9uy8e44mc','ROLE-2026-0008','COMPANY_SETUP_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL),(404,'RP-1776762291298-39027-3si48uuz9','ROLE-2026-0008','REIMBURSEMENT_CATEGORY_VIEW',0,NULL,'2026-04-21 09:04:51','USR002','2026-04-21 09:04:51',NULL,NULL);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_role_code` (`user_role_code`),
  UNIQUE KEY `unique_user_role` (`user_code`,`role_code`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,'UR-1768277730452-5mb0hweoi','USR001','ADMIN',0,NULL,'2026-01-12 13:59:55','SYSTEM','2026-01-13 04:15:30','USR001',NULL),(2,'UR-1768276217756-jzjomfb2p','USR002','ROLE-2026-0007',0,NULL,'2026-01-13 03:50:17','USR001','2026-01-13 03:50:17',NULL,NULL),(3,'UR-1768276217769-a0cnoj3to','USR002','ROLE-2026-0004',0,NULL,'2026-01-13 03:50:17','USR001','2026-01-13 03:50:17',NULL,NULL),(4,'UR-1768276217853-omblfwrxh','USR002','ROLE-2026-0001',0,NULL,'2026-01-13 03:50:17','USR001','2026-01-13 03:50:17',NULL,NULL),(5,'UR-1768276217856-nf2w0kjcn','USR002','ROLE-2026-0006',0,NULL,'2026-01-13 03:50:17','USR001','2026-01-13 03:50:17',NULL,NULL),(6,'UR-1768276217859-2tsim5pdp','USR002','ROLE-2026-0003',0,NULL,'2026-01-13 03:50:17','USR001','2026-01-13 03:50:17',NULL,NULL),(7,'UR-1768276217860-hag27c22b','USR002','ROLE-2026-0005',0,NULL,'2026-01-13 03:50:17','USR001','2026-01-13 03:50:17',NULL,NULL),(8,'UR-1768276217951-x4fvbu6mw','USR002','ROLE-2026-0002',0,NULL,'2026-01-13 03:50:17','USR001','2026-01-13 03:50:17',NULL,NULL),(9,'UR-1768278060589-dy88tbewh','USR007','ROLE-2026-0006',1,'2026-01-22 14:55:20','2026-01-13 04:02:09','USR002','2026-01-22 14:55:20','USR002','USR002'),(10,'UR-1768277301955-ady2dam2a','USR004','ROLE-2026-0001',0,NULL,'2026-01-13 04:08:21','USR007','2026-01-13 04:08:21',NULL,NULL),(11,'UR-1768277302053-192me8vrr','USR004','ROLE-2026-0006',1,'2026-01-22 14:46:31','2026-01-13 04:08:22','USR007','2026-01-22 14:46:31','USR002','USR002'),(12,'UR-1768287871883-15815-bq40674fk','USR005','ROLE-2026-0006',0,NULL,'2026-01-13 07:04:31','USR001','2026-01-13 07:04:31',NULL,NULL),(13,'UR-1768288007214-15815-ekb5r8ifr','USR005','ROLE-2026-0007',0,NULL,'2026-01-13 07:06:47','USR001','2026-01-13 07:06:47',NULL,NULL),(14,'UR-1768288007214-15815-b52x1dx14','USR005','ROLE-2026-0004',0,NULL,'2026-01-13 07:06:47','USR001','2026-01-13 07:06:47',NULL,NULL),(15,'UR-1768288007215-15815-zphdzrrlr','USR005','ROLE-2026-0001',0,NULL,'2026-01-13 07:06:47','USR001','2026-01-13 07:06:47',NULL,NULL),(16,'UR-1768288007216-15815-0kcxi34wm','USR005','ROLE-2026-0003',0,NULL,'2026-01-13 07:06:47','USR001','2026-01-13 07:06:47',NULL,NULL),(17,'UR-1768288007216-15815-3egmdrcew','USR005','ROLE-2026-0005',0,NULL,'2026-01-13 07:06:47','USR001','2026-01-13 07:06:47',NULL,NULL),(18,'UR-1768288007217-15815-x98jf8nom','USR005','ROLE-2026-0002',0,NULL,'2026-01-13 07:06:47','USR001','2026-01-13 07:06:47',NULL,NULL),(19,'UR-1768366553212-1139-abz5nr9ug','USER-2026-0007','ROLE-2026-0003',1,'2026-01-22 14:51:48','2026-01-14 04:55:53','USER-2026-0007','2026-01-22 14:51:48','USR002','USR002'),(20,'UR-1768366553214-1139-pw1fsmvr9','USER-2026-0007','ROLE-2026-0006',1,'2026-01-22 14:51:48','2026-01-14 04:55:53','USER-2026-0007','2026-01-22 14:51:48','USR002','USR002'),(21,'UR-1768366553215-1139-8q4ixfdlu','USER-2026-0007','ROLE-2026-0005',1,'2026-01-22 14:51:48','2026-01-14 04:55:53','USER-2026-0007','2026-01-22 14:51:48','USR002','USR002'),(22,'UR-1768366553216-1139-d71jr77ea','USER-2026-0007','ROLE-2026-0002',0,NULL,'2026-01-14 04:55:53','USER-2026-0007','2026-01-14 04:55:53',NULL,NULL),(23,'UR-1769488520453-63855-ys9nety5a','USER-2026-0007','ROLE-2026-0001',0,NULL,'2026-01-14 04:55:53','USER-2026-0007','2026-01-27 04:35:20','USR002','USR002'),(24,'UR-1768373225351-1139-bm12tbncf','USR003','ROLE-2026-0004',0,NULL,'2026-01-14 06:47:05','USR002','2026-01-14 06:47:05',NULL,NULL),(25,'UR-1769060760564-19540-9z925y0jh','USER-2026-0008','ROLE-2026-0006',1,'2026-01-22 14:32:52','2026-01-19 06:39:25','USR002','2026-01-22 14:32:52','USR002','USR002'),(26,'UR-1768804831364-1066-jar9591mo','USER-2026-0008','ROLE-2026-0003',1,'2026-01-22 05:45:14','2026-01-19 06:40:31','USR002','2026-01-22 05:45:14','USR002','USR002'),(27,'UR-1779421509590-1436-z7l8j2q4c','USER-2026-0008','ROLE-2026-0001',0,NULL,'2026-01-19 06:40:31','USR002','2026-05-22 03:45:09','USR002','USR002'),(28,'UR-1769061192143-19540-uj6utlngd','USER-2026-0008','ROLE-2026-0002',1,'2026-01-22 14:33:41','2026-01-19 06:41:18','USR002','2026-01-22 14:33:41','USR002','USR002'),(29,'UR-1768804878720-1066-i2ofvre2b','USER-2026-0008','ROLE-2026-0005',1,'2026-01-22 05:42:23','2026-01-19 06:41:18','USR002','2026-01-22 05:42:23','USR002','USR002'),(30,'UR-1769060714175-19540-51x2snsrw','USER-2026-0008','ROLE-2026-0008',0,NULL,'2026-01-22 05:45:14','USR002','2026-01-22 05:45:14',NULL,NULL),(31,'UR-1769061398596-19540-uuxobkx9l','USR004','ROLE-2026-0007',1,'2026-01-22 14:46:31','2026-01-22 05:56:38','USR002','2026-01-22 14:46:31','USR002','USR002'),(32,'UR-1769093720125-27704-z93pff717','USR007','ROLE-2026-0002',0,NULL,'2026-01-22 14:55:20','USR002','2026-01-22 14:55:20',NULL,NULL),(33,'UR-1769093776421-27704-ibnljj93x','USR007','ROLE-2026-0001',0,NULL,'2026-01-22 14:56:16','USR002','2026-01-22 14:56:16',NULL,NULL),(34,'UR-1769093844839-27704-eibvo1fuf','USR004','ROLE-2026-0002',0,NULL,'2026-01-22 14:57:24','USR002','2026-01-22 14:57:24',NULL,NULL),(35,'UR-1769702921067-114571-103jxlncb','USR004','ROLE-2026-0009',1,'2026-01-29 16:12:49','2026-01-29 16:08:41','USR001','2026-01-29 16:12:49','USR001','USR001');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `tax_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tax_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tax_rate` decimal(5,2) NOT NULL,
  `tax_type` enum('vat','pph','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_code` (`tax_code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `tax_types` WRITE;
/*!40000 ALTER TABLE `tax_types` DISABLE KEYS */;
INSERT INTO `tax_types` VALUES (15,'PPN12','PPN 12%','PPN 12%',12.00,'vat',1,0,NULL,'2026-01-11 00:56:11','2026-01-11 00:56:11'),(16,'PPN11','PPN 11%','PPN 11%',11.00,'vat',1,0,NULL,'2026-01-11 00:56:28','2026-01-11 00:56:28');
/*!40000 ALTER TABLE `tax_types` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `reimbursement_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reimbursement_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `reimbursement_categories` WRITE;
/*!40000 ALTER TABLE `reimbursement_categories` DISABLE KEYS */;
INSERT INTO `reimbursement_categories` VALUES (1,'CATOG2M','Alkes','Cashback',1,0,'2026-01-12 04:47:21','2026-01-14 08:54:20'),(2,'CATOG2N','Cafe Lodok','Transport',1,0,'2026-01-20 08:36:49','2026-01-20 08:36:49'),(3,'CATOG2O','Internet','Software',1,0,'2026-01-28 04:22:46','2026-01-28 04:22:46'),(4,'CATOG2P','Transport','Tranport MP',1,0,'2026-02-05 09:09:41','2026-02-05 09:09:41'),(5,'CATOG2Q','Ongkos Kirim','',1,0,'2026-02-05 09:11:07','2026-02-05 09:11:07'),(6,'CATOG2S','ATK dan Printing','',1,0,'2026-02-05 09:12:08','2026-02-05 09:12:08'),(7,'CATOG2T','Listrik','',1,0,'2026-02-05 09:13:33','2026-02-05 09:13:33'),(8,'CATOG2U','Telephone and internet','',1,0,'2026-02-05 09:14:00','2026-02-05 09:14:00'),(9,'CATOG2Z','Asuransi','',1,0,'2026-02-05 09:14:35','2026-02-05 09:14:35'),(10,'CATOG2A','Repair & Maintenance','',1,0,'2026-02-05 09:15:24','2026-02-05 09:15:24'),(11,'CATOG2B','Beban Pelatihan Karyawan','',1,0,'2026-02-05 09:16:08','2026-02-05 09:16:08'),(12,'CATOG2C','Biaya Sewa','',1,0,'2026-02-05 09:16:22','2026-02-05 09:16:22'),(13,'CATOG2D','Beban Perizinan & Lisensi','',1,0,'2026-02-05 09:16:43','2026-02-05 09:16:43'),(14,'CATOG2E','Makan Kantor','',1,0,'2026-02-05 09:17:50','2026-02-05 09:17:50'),(15,'CATOG2F','Beban Profesional Fee','',1,0,'2026-02-05 09:18:28','2026-02-05 09:18:28'),(16,'CATOG2G','Biaya Marketing','',1,0,'2026-02-05 09:19:30','2026-02-05 09:19:30'),(17,'TRANS 1','Beban Lain-Lain','',1,0,'2026-02-25 02:49:42','2026-02-25 02:49:42');
/*!40000 ALTER TABLE `reimbursement_categories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `transaction_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_code` (`type_code`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `transaction_types` WRITE;
/*!40000 ALTER TABLE `transaction_types` DISABLE KEYS */;
INSERT INTO `transaction_types` VALUES (1,'sale','Penjualan','Jurnal penjualan barang/jasa',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(2,'purchase','Pembelian','Jurnal pembelian barang/jasa',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(3,'payment_in','Penerimaan Pembayaran','Jurnal penerimaan kas/bank dari customer',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(4,'payment_out','Pengeluaran Pembayaran','Jurnal pengeluaran kas/bank ke supplier',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(5,'inter_co_send','Inter-Company Pengirim','Jurnal antar perusahaan (pengirim dana)',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(6,'inter_co_receive','Inter-Company Penerima','Jurnal antar perusahaan (penerima dana)',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(7,'cash_advance','Cash Advance','Jurnal uang muka karyawan',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(8,'reimbursement','Reimbursement','Jurnal penggantian biaya',1,'2026-05-27 15:17:00','2026-05-27 15:17:00'),(9,'cogs','Harga Pokok Penjualan',NULL,1,'2026-05-27 21:53:28','2026-05-27 21:53:28'),(10,'payment_in_interco','Penerimaan Kas Intercompany',NULL,1,'2026-05-28 00:13:42','2026-05-28 00:13:42'),(11,'ar_to_interco','Piutang Interco',NULL,1,'2026-05-28 00:13:42','2026-05-28 00:13:42');
/*!40000 ALTER TABLE `transaction_types` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


-- ============================================================
-- NUMBERING SEQUENCES (reset to 1)
-- ============================================================

-- Numbering Sequences (reset ke awal)
INSERT INTO `numbering_sequences` (`sequence_code`, `prefix`, `next_number`, `description`) VALUES
('SO',   'SO/{customer}{project}/{company}/', 1,  'Sales Order'),
('PO',   'PO-{customer}-{project}-{company}-{sales_rep}/', 1, 'Purchase Order'),
('DO',   'DO/', 1,  'Delivery Order'),
('INV',  'INV', 1,  'Invoice'),
('PAY',  'PAY', 1,  'Payment'),
('CA',   'CA',  1,  'Cash Advance'),
('REIMB','REIMB', 1, 'Reimbursement'),
('AR',   'AR',  1,  'Accounts Receivable'),
('AP',   'AP',  1,  'Accounts Payable'),
('JNL',  'JNL', 1,  'Journal Entry')
ON DUPLICATE KEY UPDATE next_number = VALUES(next_number);

SET FOREIGN_KEY_CHECKS = 1;
