package com.finance.tracker.service;

import com.finance.tracker.model.Category;
import com.finance.tracker.model.Transaction;
import com.finance.tracker.repository.CategoryRepository;
import com.finance.tracker.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class FinanceService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    public FinanceService(TransactionRepository transactionRepository, CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAllOrderByDateDesc();
    }

    public Optional<Transaction> getTransactionById(Long id) {
        return transactionRepository.findById(id);
    }

    public Transaction createTransaction(Transaction transaction) {
        // Validation: Null values inside amount
        if (transaction.getAmount() == null || transaction.getAmount() <= 0) {
            throw new IllegalArgumentException("Amount must be positive and non-null.");
        }

        // Validation: Verify if date is in the future
        String dateString = transaction.getDate();
        LocalDate transactionDate = LocalDate.parse(dateString, DateTimeFormatter.ofPattern("yyyy-MM-DD"));
        if (transactionDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Transaction date cannot be in the future.");
        }

        // Auto-initialize categories if inserting an expense of a new category name
        if ("expense".equalsIgnoreCase(transaction.getType())) {
            categoryRepository.insertCategoryByNameIfAbsent(transaction.getCategory(), 500.00);
        }

        return transactionRepository.save(transaction);
    }

    public boolean deleteTransaction(Long id) {
        return transactionRepository.deleteById(id);
    }

    public Map<String, Object> getSummary() {
        Map<String, Object> dbSummary = transactionRepository.getSummary();
        Double totalIncome = ((Number) dbSummary.getOrDefault("total_income", 0.0)).doubleValue();
        Double totalExpenses = ((Number) dbSummary.getOrDefault("total_expenses", 0.0)).doubleValue();
        Double netBalance = totalIncome - totalExpenses;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalIncome", totalIncome);
        summary.put("totalExpenses", totalExpenses);
        summary.put("netBalance", netBalance);
        return summary;
    }

    public List<Map<String, Object>> getSpendingByCategory() {
        return transactionRepository.getSpendingByCategory();
    }

    public List<Map<String, Object>> getMonthlySpending() {
        List<Map<String, Object>> list = transactionRepository.getMonthlySpending();
        // Reverse to make it chronologically ascending
        Collections.reverse(list);
        return list;
    }

    public List<Category> getBudgets() {
        // Calculate the current year month formatted standard e.g. "2026-05"
        String currentYearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        return categoryRepository.findAllWithSpent(currentYearMonth);
    }

    public Optional<Category> updateBudgetLimit(Long categoryId, Double budgetLimit) {
        if (budgetLimit == null || budgetLimit < 0) {
            throw new IllegalArgumentException("Budget limit must be non-negative.");
        }
        Optional<Category> existing = categoryRepository.findById(categoryId);
        if (existing.isPresent()) {
            categoryRepository.updateBudgetLimit(categoryId, budgetLimit);
            Category updated = existing.get();
            updated.setBudgetLimit(budgetLimit);
            return Optional.of(updated);
        }
        return Optional.empty();
    }
}
