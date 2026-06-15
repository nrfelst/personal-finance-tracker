package com.finance.tracker.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class Category {
    private Long id;

    @NotBlank(message = "Category name is required")
    private String name;

    @NotNull(message = "Budget limit is required")
    @DecimalMin(value = "0.0", message = "Budget limit must be non-negative")
    private Double budgetLimit; // Mapping budget_limit from sql

    private Double spent; // Calculated field for budget analysis response

    // Constructors
    public Category() {}

    public Category(Long id, String name, Double budgetLimit) {
        this.id = id;
        this.name = name;
        this.budgetLimit = budgetLimit;
    }

    public Category(Long id, String name, Double budgetLimit, Double spent) {
        this.id = id;
        this.name = name;
        this.budgetLimit = budgetLimit;
        this.spent = spent;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getBudgetLimit() { return budgetLimit; }
    public void setBudgetLimit(Double budgetLimit) { this.budgetLimit = budgetLimit; }

    public Double getSpent() { return spent; }
    public void setSpent(Double spent) { this.spent = spent; }
}
