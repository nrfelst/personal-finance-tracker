package com.finance.tracker.controller;

import com.finance.tracker.model.Category;
import com.finance.tracker.model.Transaction;
import com.finance.tracker.service.FinanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "http://localhost:3000", maxAge = 3600)
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    // GET /transactions — return all transactions ordered by date descending
    @GetMapping("/transactions")
    public List<Transaction> getAllTransactions() {
        return financeService.getAllTransactions();
    }

    // GET /transactions/{id} — return a single transaction by ID
    @GetMapping("/transactions/{id}")
    public ResponseEntity<?> getTransactionById(@PathVariable Long id) {
        Optional<Transaction> transaction = financeService.getTransactionById(id);
        if (transaction.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Transaction with ID " + id + " not found.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        return ResponseEntity.ok(transaction.get());
    }

    // POST /transactions — add a new transaction (accept JSON body)
    @PostMapping("/transactions")
    public ResponseEntity<?> createTransaction(@Valid @RequestBody Transaction transaction, BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
        }

        try {
            Transaction created = financeService.createTransaction(transaction);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to create transaction: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // DELETE /transactions/{id} — delete a transaction by ID
    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id) {
        boolean deleted = financeService.deleteTransaction(id);
        if (!deleted) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Transaction with ID " + id + " not found.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        Map<String, String> message = new HashMap<>();
        message.put("message", "Transaction successfully deleted.");
        return ResponseEntity.ok(message);
    }

    // GET /transactions/summary — return total income, total expenses, and net balance
    @GetMapping("/transactions/summary")
    public Map<String, Object> getSummary() {
        return financeService.getSummary();
    }

    // GET /transactions/by-category — return total spending grouped by category
    @GetMapping("/transactions/by-category")
    public List<Map<String, Object>> getSpendingByCategory() {
        return financeService.getSpendingByCategory();
    }

    // GET /transactions/monthly — return total spending per month for the last 6 months
    @GetMapping("/transactions/monthly")
    public List<Map<String, Object>> getMonthlySpending() {
        return financeService.getMonthlySpending();
    }

    // GET /budget — return each category with its budget limit and actual amount spent
    @GetMapping("/budget")
    public List<Category> getBudgets() {
        return financeService.getBudgets();
    }

    // PUT /budget/{categoryId} — update the budget limit for a category
    @PutMapping("/budget/{categoryId}")
    public ResponseEntity<?> updateBudgetLimit(@PathVariable Long categoryId, @RequestBody Map<String, Double> body) {
        Double budgetLimit = body.get("budget_limit");
        if (budgetLimit == null) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "budget_limit field is required.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }

        try {
            Optional<Category> updated = financeService.updateBudgetLimit(categoryId, budgetLimit);
            if (updated.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Category with ID " + categoryId + " not found.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.ok(updated.get());
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update budget: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
