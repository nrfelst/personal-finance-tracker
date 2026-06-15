package com.finance.tracker.repository;

import com.finance.tracker.model.Category;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class CategoryRepository {

    private final JdbcTemplate jdbcTemplate;

    public CategoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Category> categoryRowMapper = new RowMapper<Category>() {
        @Override
        public Category mapRow(ResultSet rs, int rowNum) throws SQLException {
            Category category = new Category();
            category.setId(rs.getLong("id"));
            category.setName(rs.getString("name"));
            category.setBudgetLimit(rs.getDouble("budgetLimit"));
            
            // Check if spent column is included in query projection
            try {
                category.setSpent(rs.getDouble("spent"));
            } catch (SQLException e) {
                category.setSpent(0.0);
            }
            return category;
        }
    };

    public List<Category> findAllWithSpent(String currentYearMonth) {
        String sql = "SELECT " +
                "  c.id, " +
                "  c.name, " +
                "  c.budget_limit as budgetLimit, " +
                "  COALESCE(SUM(CASE WHEN t.type = 'expense' AND SUBSTR(t.date, 1, 7) = ? THEN t.amount ELSE 0 END), 0) as spent " +
                "FROM categories c " +
                "LEFT JOIN transactions t ON LOWER(c.name) = LOWER(t.category) " +
                "GROUP BY c.id, c.name, c.budget_limit";
        return jdbcTemplate.query(sql, categoryRowMapper, currentYearMonth);
    }

    public Optional<Category> findById(Long id) {
        String sql = "SELECT id, name, budget_limit as budgetLimit FROM categories WHERE id = ?";
        List<Category> results = jdbcTemplate.query(sql, (rs, rowNum) -> {
            Category c = new Category();
            c.setId(rs.getLong("id"));
            c.setName(rs.getString("name"));
            c.setBudgetLimit(rs.getDouble("budgetLimit"));
            c.setSpent(0.0);
            return c;
        }, id);
        return results.stream().findFirst();
    }

    public void updateBudgetLimit(Long categoryId, Double budgetLimit) {
        String sql = "UPDATE categories SET budget_limit = ? WHERE id = ?";
        jdbcTemplate.update(sql, budgetLimit, categoryId);
    }

    public void insertCategoryByNameIfAbsent(String name, Double defaultLimit) {
        String checkSql = "SELECT COUNT(*) FROM categories WHERE LOWER(name) = LOWER(?)";
        Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, name);
        if (count == null || count == 0) {
            String insertSql = "INSERT INTO categories (name, budget_limit) VALUES (?, ?)";
            jdbcTemplate.update(insertSql, name, defaultLimit);
        }
    }
}
