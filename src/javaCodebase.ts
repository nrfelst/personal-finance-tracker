export interface JavaFile {
  name: string;
  path: string;
  language: string;
  code: string;
}

export const JAVA_CODEBASE: JavaFile[] = [
  {
    name: "pom.xml",
    path: "pom.xml",
    language: "xml",
    code: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.4</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <groupId>com.finance</groupId>
    <artifactId>personal-finance-tracker</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <name>personal-finance-tracker</name>
    <description>Java Spring Boot REST API backend for Personal Finance Tracking</description>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <!-- Spring Boot Web Starter for REST endpoints -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Spring Boot JDBC Starter for database interactions -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>

        <!-- SQLite JDBC Driver driver -->
        <dependency>
            <groupId>org.xerial</groupId>
            <artifactId>sqlite-jdbc</artifactId>
            <version>3.45.1.0</version>
        </dependency>

        <!-- Spring Boot Starter Validation for input checking -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
    </dependencies>
</project>`
  },
  {
    name: "schema.sql",
    path: "src/main/resources/schema.sql",
    language: "sql",
    code: `-- Schema for Personal Finance Tracker SQLite Database
-- Create the categories and transactions tables

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    budget_limit REAL NOT NULL
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense'))
);`
  },
  {
    name: "PersonalFinanceApplication.java",
    path: "src/main/java/com/finance/tracker/PersonalFinanceApplication.java",
    language: "java",
    code: `package com.finance.tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PersonalFinanceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PersonalFinanceApplication.class, args);
    }
}`
  },
  {
    name: "Transaction.java",
    path: "src/main/java/com/finance/tracker/model/Transaction.java",
    language: "java",
    code: `package com.finance.tracker.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class Transaction {
    private Long id;

    @NotNull(message = "Amount cannot be null")
    @DecimalMin(value = "0.01", message = "Amount must be positive")
    private Double amount;

    @NotBlank(message = "Date is required")
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Date must be YYYY-MM-DD")
    private String date;

    @NotBlank(message = "Category is required")
    private String category;

    private String description;

    @NotBlank(message = "Type must be specified")
    @Pattern(regexp = "^(income|expense)$")
    private String type;

    // Standard constructor, getters and setters...
}`
  },
  {
    name: "Category.java",
    path: "src/main/java/com/finance/tracker/model/Category.java",
    language: "java",
    code: `package com.finance.tracker.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class Category {
    private Long id;

    @NotBlank(message = "Category name is required")
    private String name;

    @NotNull(message = "Budget limit is required")
    @DecimalMin(value = "0.0", message = "Limit must be non-negative")
    private Double budgetLimit;

    private Double spent;

    // Standard constructor, getters and setters...
}`
  },
  {
    name: "TransactionRepository.java",
    path: "src/main/java/com/finance/tracker/repository/TransactionRepository.java",
    language: "java",
    code: `package com.finance.tracker.repository;

import com.finance.tracker.model.Transaction;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class TransactionRepository {
    private final JdbcTemplate jdbcTemplate;

    public TransactionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Transaction> findAllOrderByDateDesc() {
        String sql = "SELECT * FROM transactions ORDER BY date DESC, id DESC";
        return jdbcTemplate.query(sql, transactionRowMapper);
    }

    public Optional<Transaction> findById(Long id) {
        String sql = "SELECT * FROM transactions WHERE id = ?";
        List<Transaction> results = jdbcTemplate.query(sql, transactionRowMapper, id);
        return results.stream().findFirst();
    }

    public Transaction save(Transaction t) {
        // SQL Insert / Update implementation...
    }
}`
  },
  {
    name: "FinanceService.java",
    path: "src/main/java/com/finance/tracker/service/FinanceService.java",
    language: "java",
    code: `package com.finance.tracker.service;

import com.finance.tracker.model.Category;
import com.finance.tracker.model.Transaction;
import com.finance.tracker.repository.CategoryRepository;
import com.finance.tracker.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class FinanceService {
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    public FinanceService(TransactionRepository tr, CategoryRepository cr) {
        this.transactionRepository = tr;
        this.categoryRepository = cr;
    }

    public Transaction createTransaction(Transaction transaction) {
        if (transaction.getAmount() == null || transaction.getAmount() <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        return transactionRepository.save(transaction);
    }
    
    // Additional service mappings for summaries and month tracking...
}`
  },
  {
    name: "FinanceController.java",
    path: "src/main/java/com/finance/tracker/controller/FinanceController.java",
    language: "java",
    code: `package com.finance.tracker.controller;

import com.finance.tracker.model.Category;
import com.finance.tracker.model.Transaction;
import com.finance.tracker.service.FinanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
public class FinanceController {
    private final FinanceService financeService;

    public FinanceController(FinanceService fs) {
        this.financeService = fs;
    }

    @GetMapping("/transactions")
    public List<Transaction> getAllTransactions() {
        return financeService.getAllTransactions();
    }

    @PostMapping("/transactions")
    public ResponseEntity<?> createTransaction(@Valid @RequestBody Transaction transaction) {
        Transaction created = financeService.createTransaction(transaction);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id) {
        financeService.deleteTransaction(id);
        return ResponseEntity.ok().build();
    }
}`
  }
];
