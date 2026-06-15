package com.finance.tracker.repository;

import com.finance.tracker.model.Transaction;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class TransactionRepository {

    private final JdbcTemplate jdbcTemplate;

    public TransactionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Transaction> transactionRowMapper = new RowMapper<Transaction>() {
        @Override
        public Transaction mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Transaction(
                    rs.getLong("id"),
                    rs.getDouble("amount"),
                    rs.getString("date"),
                    rs.getString("category"),
                    rs.getString("description"),
                    rs.getString("type")
            );
        }
    };

    public List<Transaction> findAllOrderByDateDesc() {
        String sql = "SELECT * FROM transactions ORDER BY date DESC, id DESC";
        return jdbcTemplate.query(sql, transactionRowMapper);
    }

    public Optional<Transaction> findById(Long id) {
        String sql = "SELECT * FROM transactions WHERE id = ?";
        List<Transaction> results = jdbcTemplate.query(sql, transactionRowMapper, id);
        return results.stream().findFirst();
    }

    public Transaction save(Transaction transaction) {
        if (transaction.getId() == null) {
            String sql = "INSERT INTO transactions (amount, date, category, description, type) VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();

            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setDouble(1, transaction.getAmount());
                ps.setString(2, transaction.getDate());
                ps.setString(3, transaction.getCategory());
                ps.setString(4, transaction.getDescription() != null ? transaction.getDescription() : "");
                ps.setString(5, transaction.getType());
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                transaction.setId(keyHolder.getKey().longValue());
            }
        } else {
            String sql = "UPDATE transactions SET amount = ?, date = ?, category = ?, description = ?, type = ? WHERE id = ?";
            jdbcTemplate.update(sql, 
                    transaction.getAmount(), 
                    transaction.getDate(), 
                    transaction.getCategory(), 
                    transaction.getDescription() != null ? transaction.getDescription() : "", 
                    transaction.getType(), 
                    transaction.getId());
        }
        return transaction;
    }

    public boolean deleteById(Long id) {
        String sql = "DELETE FROM transactions WHERE id = ?";
        int rowsAffected = jdbcTemplate.update(sql, id);
        return rowsAffected > 0;
    }

    public Map<String, Object> getSummary() {
        String sql = "SELECT " +
                "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income, " +
                "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses " +
                "FROM transactions";
        
        return jdbcTemplate.queryForMap(sql);
    }

    public List<Map<String, Object>> getSpendingByCategory() {
        String sql = "SELECT category, SUM(amount) as total " +
                "FROM transactions " +
                "WHERE type = 'expense' " +
                "GROUP BY category " +
                "ORDER BY total DESC";
        return jdbcTemplate.queryForList(sql);
    }

    public List<Map<String, Object>> getMonthlySpending() {
        // SQLite uses SUBSTR(date, 1, 7) to extract YYYY-MM
        String sql = "SELECT SUBSTR(date, 1, 7) as month, SUM(amount) as total " +
                "FROM transactions " +
                "WHERE type = 'expense' " +
                "GROUP BY month " +
                "ORDER BY month DESC " +
                "LIMIT 6";
        return jdbcTemplate.queryForList(sql);
    }
}
